import { test, expect, Response } from '@playwright/test';
import { CODE_EDITOR_URLS } from './fixtures/urls';
import { LIVE_REQUEST_TIMEOUT, HEAVY_TEST_TIMEOUT } from './fixtures/timeouts';

const OPENEO_RESULT_URL = 'openeosh.dataspace.copernicus.eu/1.2/result';
const SH_PROCESS_URL = '/api/v1/process';

// this tests will load a Sentinel-2 image and check if openEO results requests are made
// we then switch to custom script and check if the correct request is made, then we test the compare view
// and check if process api is used, following this we add 2 layers to compare and check the compare view
// is active by asserting both compare layers issue tile requests and the split-view sliders render.
test('test correct service is used with compare', async ({ page }) => {
  // Heavy multi-step test (nav + two API waits + 2 compare layers + slider assertions).
  // The default 30s budget is too tight under single-worker CI, so give it headroom.
  test.setTimeout(HEAVY_TEST_TIMEOUT);

  // Register listener before navigation so we don't miss the response
  const openEOResponse = page.waitForResponse(
    (resp) => resp.url().includes(OPENEO_RESULT_URL) && resp.status() === 200,
    { timeout: LIVE_REQUEST_TIMEOUT },
  );
  await page.goto(CODE_EDITOR_URLS.s2L2aTrueColor);
  // Assert default requests are using openEO
  await openEOResponse;

  await page.getByTitle('Show custom option').click();

  // Register listener before the action that triggers the request
  const evalscriptResponse = page.waitForResponse(
    (resp) => resp.url().includes(SH_PROCESS_URL) && resp.status() === 200,
    { timeout: LIVE_REQUEST_TIMEOUT },
  );
  await page.getByRole('radio', { name: 'Custom script' }).check();
  await evalscriptResponse;

  await page.getByText('Back', { exact: true }).click();
  await page.getByText('True color').click();
  await page.getByTitle('Add to').click();
  await page.getByText('Add to Compare').click();
  await page.getByText('False color', { exact: true }).click();
  await page.getByText('Add to Compare').click();
  await expect(page.getByText('2', { exact: true })).toBeVisible();

  // Track every openEO tile response fired once the compare panel opens — the split view
  // mounts one Leaflet pane per compare layer, so both layers must issue a tile request.
  const compareTileUrls: string[] = [];
  const onCompareTile = (resp: Response) => {
    if (resp.url().includes(OPENEO_RESULT_URL) && resp.status() === 200) {
      compareTileUrls.push(resp.url());
    }
  };
  page.on('response', onCompareTile);

  try {
    await page.getByTitle('Compare Panel').click();

    // Assert the compare view is active: both compare layers issued a tile request, and the
    // split-view sliders rendered (2 layers × 2 handles = 4 sliders in split mode).
    await expect
      .poll(() => compareTileUrls.length, { timeout: LIVE_REQUEST_TIMEOUT })
      .toBeGreaterThanOrEqual(2);
    await expect(page.getByRole('slider')).toHaveCount(4);
  } finally {
    page.off('response', onCompareTile);
  }
});
