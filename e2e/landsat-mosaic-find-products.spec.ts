import { test, expect } from '@playwright/test';

// visualizationUrl is AES-encrypted (VITE_CDAS_ENCRYPT_SECRET) and points to the
// Sentinel Hub BYOC process API base URL. Decrypt with the app's secret to update.
const LANDSAT_MOSAIC_EUROPE_URL =
  '/?zoom=10&lat=48.85&lng=2.35&themeId=DEFAULT-THEME' +
  '&visualizationUrl=U2FsdGVkX1%2BZ%2BwqAJ%2B4Ni6PP0BxIJrFC2mz9vDUlnE9IPXYIXeZH1iWskVlgHK97GJohAOAgErY59cIgSsB%2BnGuK%2FbHUobv3itujVEgfW4Zu%2BxsDa1O8Ps%2BYl1gHQo3k' +
  '&datasetId=CDAS_LANDSAT_MOSAIC' +
  '&fromTime=2024-07-01T00%3A00%3A00.000Z&toTime=2024-07-31T23%3A59%3A59.999Z' +
  '&demSource3D=%22MAPZEN%22&cloudCoverage=30&dateMode=SINGLE';

test('Landsat Mosaic find products uses STAC and returns results', async ({ page }) => {
  await page.goto(LANDSAT_MOSAIC_EUROPE_URL);
  // The app performs a real Keycloak check-sso redirect through identity.dataspace.copernicus.eu
  // before anything renders, which combined with BYOC dataset bootstrap can exceed the default
  // 5s timeout under CI load even though the app always reaches this state.
  // Scoped to #visualization-tab because Leaflet's own layers-control also renders a
  // "Landsat Mosaics" label span inside #map, which would otherwise make the locator ambiguous.
  await expect(page.locator('#visualization-tab').getByText('Landsat Mosaics')).toBeVisible({
    timeout: 15000,
  });

  // The date panel is collapsed by default; expand it to reveal the Find Products button.
  await page.locator('.visualization-time-select .title-arrow-wrapper').click();

  // Register interceptors before the action that triggers the request.
  const stacRequest = page.waitForRequest(
    (req) =>
      req.method() === 'POST' &&
      req.url().includes('stac.opensearch.dataspace.copernicus.eu/v1/search'),
  );
  const stacResponse = page.waitForResponse(
    (resp) =>
      resp.url().includes('stac.opensearch.dataspace.copernicus.eu/v1/search') &&
      resp.status() === 200,
  );

  await page.getByText('Find products for current view').click();

  await stacRequest;
  const resp = await stacResponse;
  const body = await resp.json();

  expect(body.features).toBeDefined();
  expect(body.features.length).toBeGreaterThan(0);
});
