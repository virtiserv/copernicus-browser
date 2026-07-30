import { test, expect } from '@playwright/test';
import { CODE_EDITOR_URLS } from './fixtures/urls';
import { getSaveResultFormat } from './fixtures/helpers';
import { LIVE_REQUEST_TIMEOUT, HEAVY_TEST_TIMEOUT } from './fixtures/timeouts';

const OPENEO_RESULT_URL = 'openeosh.dataspace.copernicus.eu/1.2/result';
const SH_PROCESS_URL = '/api/v1/process';
const CLMS_VECTOR_WMS_URL = 'mapserver.dataspace.copernicus.eu';
const OPENEO_VISUALIZATION_FORMATS = ['png', 'jpg', 'webp'];

test('openEO tile requests send a valid visualization format from the process graph save_result node', async ({
  page,
}) => {
  // Cold openEO tile load under single-worker CI; the default 30s budget is too tight.
  test.setTimeout(60_000);

  const tileRequest = page.waitForRequest(
    (r) => r.method() === 'POST' && r.url().includes(OPENEO_RESULT_URL),
    { timeout: LIVE_REQUEST_TIMEOUT },
  );
  await page.goto(CODE_EDITOR_URLS.s2L2aTrueColor);
  const req = await tileRequest;

  const body = req.postDataJSON();
  const format = getSaveResultFormat(body.process.process_graph);
  expect(OPENEO_VISUALIZATION_FORMATS).toContain(format);
});

test('SH Processing API tile requests send image/webp as output format', async ({ page }) => {
  // Cold tile load under single-worker CI; the default 30s budget is too tight.
  test.setTimeout(60_000);

  const tileRequest = page.waitForRequest((r) => r.method() === 'POST' && r.url().includes(SH_PROCESS_URL), {
    timeout: LIVE_REQUEST_TIMEOUT,
  });
  await page.goto(CODE_EDITOR_URLS.customScript);
  const req = await tileRequest;

  const body = req.postDataJSON();
  expect(body.output.responses[0].format.type).toBe('image/webp');
});

test('WebP download for non-openEO layer routes to SH Processing API with image/webp', async ({ page }) => {
  // Chains two live waits (initial tiles + download request) under single-worker CI;
  // the combined budgets can exceed 60s, so give the whole test more headroom.
  test.setTimeout(HEAVY_TEST_TIMEOUT);

  const initialTiles = page.waitForResponse((r) => r.url().includes(SH_PROCESS_URL) && r.status() === 200, {
    timeout: LIVE_REQUEST_TIMEOUT,
  });
  await page.goto(CODE_EDITOR_URLS.customScript);
  await initialTiles;

  await page.getByTitle(/Download image/).click();
  await expect(page.locator('.image-download')).toBeVisible({ timeout: 10000 });

  const formatSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'WebP (no georeference)' }) });
  await expect(formatSelect).toBeVisible();
  await formatSelect.selectOption({ label: 'WebP (no georeference)' });

  const [downloadReq] = await Promise.all([
    page.waitForRequest((r) => r.method() === 'POST' && r.url().includes(SH_PROCESS_URL), {
      timeout: LIVE_REQUEST_TIMEOUT,
    }),
    page.getByText('Download', { exact: true }).click(),
  ]);

  const body = downloadReq.postDataJSON();
  expect(body.output.responses[0].format.type).toBe('image/webp');
});

test('CLMS Vector tiles request image/png, not WebP', async ({ page }) => {
  // Cold WMS tile load under single-worker CI; the default 30s budget is too tight.
  test.setTimeout(60_000);

  const tileRequest = page.waitForRequest(
    (r) => r.method() === 'GET' && r.url().includes(CLMS_VECTOR_WMS_URL) && r.url().includes('GetMap'),
    { timeout: LIVE_REQUEST_TIMEOUT },
  );
  await page.goto(CODE_EDITOR_URLS.clmsVectorUrbanAtlas);
  const req = await tileRequest;

  const decodedUrl = decodeURIComponent(req.url()).toLowerCase();
  expect(decodedUrl).not.toContain('openeosh');
  expect(decodedUrl).not.toContain('webp');
  expect(decodedUrl).toContain('format=image/png');
});

test('WebP download for openEO layer routes to openEO with correct format', async ({ page }) => {
  // Heavy multi-wait test (cold tile load + download request) under single-worker CI;
  // the chained wait budgets can exceed 60s, so give the whole test more headroom.
  test.setTimeout(HEAVY_TEST_TIMEOUT);

  const initialTiles = page.waitForResponse(
    (r) => r.url().includes(OPENEO_RESULT_URL) && r.status() === 200,
    { timeout: LIVE_REQUEST_TIMEOUT },
  );
  await page.goto(CODE_EDITOR_URLS.s2L2aTrueColor);
  await initialTiles;

  await page.getByTitle(/Download image/).click();
  await expect(page.locator('.image-download')).toBeVisible({ timeout: 10000 });

  const formatSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'WebP (no georeference)' }) });

  // Wait for the live preview thumbnail request triggered by the format change to settle,
  // so it can't race the download request below. Registered before the action that triggers it.
  const previewRequest = page.waitForResponse(
    (r) => r.url().includes(OPENEO_RESULT_URL) && r.status() === 200,
    {
      timeout: LIVE_REQUEST_TIMEOUT,
    },
  );
  await formatSelect.selectOption({ label: 'WebP (no georeference)' });
  await previewRequest;

  // The download panel's live preview thumbnail always requests PNG via this same
  // openEO endpoint, so the predicate must match on the save_result format itself
  // (not just URL+method) to avoid racing against the preview's request.
  const [req] = await Promise.all([
    page.waitForRequest(
      (r) =>
        r.method() === 'POST' &&
        r.url().includes(OPENEO_RESULT_URL) &&
        getSaveResultFormat(r.postDataJSON()?.process?.process_graph) === 'webp',
      { timeout: LIVE_REQUEST_TIMEOUT },
    ),
    page.getByText('Download', { exact: true }).click(),
  ]);
  expect(getSaveResultFormat(req.postDataJSON().process.process_graph)).toBe('webp');
});
