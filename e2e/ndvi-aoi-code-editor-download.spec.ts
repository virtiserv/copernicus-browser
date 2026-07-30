import { test, expect } from '@playwright/test';
import { CODE_EDITOR_URLS } from './fixtures/urls';
import { getSaveResultFormat } from './fixtures/helpers';
import { LIVE_REQUEST_TIMEOUT, HEAVY_TEST_TIMEOUT } from './fixtures/timeouts';

const OPENEO_RESULT_URL = 'openeosh.dataspace.copernicus.eu/1.2/result';

declare const monaco: {
  editor: {
    getModels: () => Array<{
      getValue: () => string;
      setValue: (value: string) => void;
    }>;
  };
};

test('NDVI layer → AOI → code editor process graph edit → download format routing', async ({ page }) => {
  // Nav + Monaco edit + two download waits chained can exceed the default 30s budget.
  test.setTimeout(HEAVY_TEST_TIMEOUT);

  // Navigate to the app and wait for initial tiles.
  // S2_L2A_CDAS True Color uses the openEO endpoint (confirmed by visualization-service-routing spec).
  const initialTiles = page.waitForResponse(
    (r) => r.url().includes(OPENEO_RESULT_URL) && r.status() === 200,
    {
      timeout: LIVE_REQUEST_TIMEOUT,
    },
  );
  await page.goto(CODE_EDITOR_URLS.s2l2aNDVI);
  await initialTiles;

  // Switch to NDVI layer
  await page.getByText('NDVI').click();

  // Open AOI tools and activate rectangular drawing mode
  await page.getByTitle('Create an area of interest', { exact: true }).click();
  await page.getByTitle('Draw rectangular area of interest for image downloads and timelapse').click();

  // Draw a small rectangle by clicking two corners (Leaflet Geoman two-click style).
  // Offsets are clamped to the container size so this also works on small viewports.
  const map = page.locator('.leaflet-container');
  const box = await map.boundingBox();
  if (!box) {
    throw new Error('Leaflet map container not visible — cannot draw AOI');
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const offsetX = Math.min(60, box.width / 4);
  const offsetY = Math.min(60, box.height / 4);
  await page.mouse.click(cx - offsetX, cy - offsetY);
  await page.mouse.click(cx + offsetX, cy + offsetY);

  // Verify AOI was drawn and Statistical Info button is enabled. This also polls for Leaflet
  // Geoman to register the second click and finalize the rectangle, instead of a fixed sleep.
  await expect(page.getByTitle('Remove area of interest')).toBeVisible();
  await expect(page.getByTitle('Statistical Info chart')).toBeVisible();

  // Open the code editor
  await page.getByTitle('Show custom option').click();

  // Verify OpenEO process graph radio is selected by default
  await expect(page.getByRole('radio', { name: 'OpenEO process graph' })).toBeChecked();

  // Statistical Info button remains accessible while the code editor is open
  await expect(page.getByTitle('Statistical Info chart')).toBeVisible();

  // Wait for Monaco to initialise before interacting with it
  await page.getByRole('textbox', { name: /Editor content/ }).waitFor({ state: 'visible' });

  // Edit the process graph: replace B04 with B03 using the Monaco editor API
  const modifiedGraph = await page.evaluate(() => {
    const models = monaco.editor.getModels();
    if (models.length === 0) {
      throw new Error('Monaco has no models — editor may not have initialised');
    }
    const model = models[0];
    const modified = model.getValue().replace(/"B04"/g, '"B03"');
    model.setValue(modified);
    // Trigger React's onChange by dispatching an input event on the hidden textarea
    const textarea = document.querySelector<HTMLTextAreaElement>('textarea[role="textbox"]');
    if (textarea) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')!.set!;
      setter.call(textarea, modified);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return modified;
  });
  expect(modifiedGraph).toContain('"B03"');
  expect(modifiedGraph).not.toContain('"B04"');

  // Apply changes and wait for new tiles to load
  const newTiles = page.waitForResponse((r) => r.url().includes(OPENEO_RESULT_URL) && r.status() === 200, {
    timeout: LIVE_REQUEST_TIMEOUT,
  });
  await page.getByRole('button', { name: 'Apply' }).click();
  await newTiles;

  // Statistical Info is now disabled — custom process graphs are not supported by FIS
  await expect(page.getByTitle('Statistical Info chart (not available for Custom).')).toBeVisible();

  // Open the download panel
  await page.getByTitle(/Download image/).click();

  // Switch to Analytical tab
  await page.getByText('Analytical').click();

  // Pick the format select: the one that contains TIFF options
  const formatSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'TIFF (32-bit float)' }) });

  // --- TIFF 32-bit: analytical download should go to openEO /result ---
  // Wait for the live preview thumbnail request triggered by the format change to settle,
  // so it can't race the download request below.
  const previewAfterTiff32 = page.waitForResponse(
    (r) => r.url().includes(OPENEO_RESULT_URL) && r.status() === 200,
    {
      timeout: LIVE_REQUEST_TIMEOUT,
    },
  );
  await formatSelect.selectOption('TIFF (32-bit float)');
  await previewAfterTiff32;

  // Register listener and click together so we can't miss the request.
  // The download panel's live preview thumbnail always requests PNG via this same
  // openEO endpoint, so the predicate must match on the save_result format itself
  // (not just URL+method) to avoid racing against the preview's request.
  const [tiff32] = await Promise.all([
    page.waitForRequest(
      (r) =>
        r.method() === 'POST' &&
        r.url().includes(OPENEO_RESULT_URL) &&
        getSaveResultFormat(r.postDataJSON()?.process?.process_graph) === 'gtiff',
      { timeout: LIVE_REQUEST_TIMEOUT },
    ),
    page.getByText('Download', { exact: true }).click(),
  ]);

  expect(tiff32.url()).toContain(OPENEO_RESULT_URL);

  const body = tiff32.postDataJSON();
  expect(getSaveResultFormat(body.process.process_graph)).toBe('gtiff');

  // --- TIFF 8-bit: should route to the SentinelHub process API, not openEO ---
  const previewAfterTiff8 = page.waitForResponse(
    (r) => r.url().includes(OPENEO_RESULT_URL) && r.status() === 200,
    {
      timeout: LIVE_REQUEST_TIMEOUT,
    },
  );
  await formatSelect.selectOption('TIFF (8-bit)');
  await previewAfterTiff8;

  // TIFF 8-bit download must use the SentinelHub process API — never openEO
  const [tiff8] = await Promise.all([
    page.waitForRequest((r) => r.method() === 'POST' && r.url().includes('/api/v1/process'), {
      timeout: LIVE_REQUEST_TIMEOUT,
    }),
    page.getByText('Download', { exact: true }).click(),
  ]);

  expect(tiff8.url()).toContain('/api/v1/process');
  expect(tiff8.url()).not.toContain('openeosh');
});
