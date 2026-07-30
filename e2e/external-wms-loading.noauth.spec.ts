import { test, expect, Page } from '@playwright/test';
import { dismissAnonymousSession } from './fixtures/helpers';

const WMTS_CAPABILITIES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1">
  <ows:ServiceIdentification>
    <ows:Title>Test WMTS Service</ows:Title>
  </ows:ServiceIdentification>
  <Contents>
    <Layer>
      <ows:Title>Blue Marble</ows:Title>
      <ows:Identifier>BlueMarble</ows:Identifier>
      <Format>image/png</Format>
      <TileMatrixSetLink><TileMatrixSet>GoogleMapsCompatible</TileMatrixSet></TileMatrixSetLink>
      <ResourceURL format="image/png" resourceType="tile" template="https://test-wmts.example/tile/BlueMarble/{TileMatrix}/{TileRow}/{TileCol}.png"/>
    </Layer>
    <Layer>
      <ows:Title>Temperature</ows:Title>
      <ows:Identifier>Temperature</ows:Identifier>
      <Format>image/png</Format>
      <TileMatrixSetLink><TileMatrixSet>GoogleMapsCompatible</TileMatrixSet></TileMatrixSetLink>
      <ResourceURL format="image/png" resourceType="tile" template="https://test-wmts.example/tile/Temperature/{TileMatrix}/{TileRow}/{TileCol}.png"/>
    </Layer>
  </Contents>
</Capabilities>`;

const WMS_CAPABILITIES_XML = `<?xml version="1.0" encoding="UTF-8"?>
<WMT_MS_Capabilities version="1.1.1">
  <Service><Title>Test WMS Service</Title></Service>
  <Capability>
    <Layer>
      <Title>Root Layer</Title>
      <Layer><Name>cities</Name><Title>Cities</Title></Layer>
      <Layer><Name>borders</Name><Title>Borders</Title></Layer>
    </Layer>
  </Capability>
</WMT_MS_Capabilities>`;

// 15 layers (> the first page size of 10) so the list paginates; one has a unique title for search.
const MANY_LAYER_NODES =
  Array.from(
    { length: 14 },
    (_, i) =>
      `<Layer><Name>common${i + 1}</Name><Title>Common Layer ${String(i + 1).padStart(
        2,
        '0',
      )}</Title></Layer>`,
  ).join('') + `<Layer><Name>unique</Name><Title>UniqueSearchTarget</Title></Layer>`;
const WMS_MANY_LAYERS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<WMT_MS_Capabilities version="1.1.1">
  <Service><Title>Many Layer WMS</Title></Service>
  <Capability><Layer><Title>Root</Title>${MANY_LAYER_NODES}</Layer></Capability>
</WMT_MS_Capabilities>`;

// 1x1 transparent PNG, used to satisfy tile / GetMap image requests.
const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
  'base64',
);

// Opens the WMS/WMTS panel from the Visualize collection toolbar and waits for the URL form.
// NOTE: any future test that does its own page.goto without this helper must call
// dismissAnonymousSession(page) BEFORE the goto — addInitScript only applies to the next
// document load, so calling it after navigation is a silent no-op and the consent modal blocks the UI.
async function openExternalLayersForm(page: Page) {
  await dismissAnonymousSession(page);
  await page.goto('/');
  const wmsButton = page.getByTitle('WMS/WMTS Panel');
  await wmsButton.waitFor({ state: 'visible', timeout: 30000 });
  await wmsButton.click();
  await page.getByPlaceholder('Enter a WMS or WMTS URL').waitFor({ state: 'visible', timeout: 15000 });
}

test('WMS/WMTS panel shows the URL form with a disabled Load button when empty', async ({ page }) => {
  await openExternalLayersForm(page);

  await expect(page.getByPlaceholder('Enter a WMS or WMTS URL')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Load' })).toBeDisabled();
});

test('loading a WMTS service shows its layers', async ({ page }) => {
  await page.route('https://test-wmts.example/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/xml', body: WMTS_CAPABILITIES_XML });
  });

  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-wmts.example/wmts');

  const loadBtn = page.getByRole('button', { name: 'Load' });
  await expect(loadBtn).not.toBeDisabled();
  await loadBtn.click();

  // Scope to the layer list: the active WMTS layer also renders its label on the map, so an
  // unscoped getByText('Blue Marble') would match two elements.
  const layerList = page.getByRole('listbox');
  await expect(layerList.getByText('Blue Marble', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(layerList.getByText('Temperature', { exact: true })).toBeVisible();
});

test('loading a WMS service shows its layers', async ({ page }) => {
  await page.route('https://test-wms.example/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/xml', body: WMS_CAPABILITIES_XML });
  });

  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-wms.example/wms');

  const loadBtn = page.getByRole('button', { name: 'Load' });
  await expect(loadBtn).not.toBeDisabled();
  await loadBtn.click();

  // Scope to the layer list (the active layer also renders a label on the map).
  const layerList = page.getByRole('listbox');
  await expect(layerList.getByText('Cities', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(layerList.getByText('Borders', { exact: true })).toBeVisible();
});

test('shows an error when the service cannot be loaded', async ({ page }) => {
  await page.route('https://test-bad.example/**', (route) => {
    route.fulfill({ status: 500 });
  });

  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-bad.example/wms');

  const loadBtn = page.getByRole('button', { name: 'Load' });
  await expect(loadBtn).not.toBeDisabled();
  await loadBtn.click();

  await expect(page.getByText(/returned an error|Could not (load|reach)/i)).toBeVisible({ timeout: 15000 });

  // The panel must survive a failed load: the URL input stays visible (the form did not crash or
  // close) and no layer options rendered. This ties the error above to a failed WMS load rather than
  // an unrelated message slipping past the broad regex.
  await expect(page.getByPlaceholder('Enter a WMS or WMTS URL')).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(0);
});

test('detects WMTS even when the URL does not hint the type', async ({ page }) => {
  // The host only ever returns WMTS capabilities. The pasted URL has no "wms"/"wmts" hint, so the
  // panel tries WMS first (parses to null), then falls back to WMTS.
  await page.route('https://test-detect.example/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/xml', body: WMTS_CAPABILITIES_XML });
  });

  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-detect.example/service');
  await page.getByRole('button', { name: 'Load' }).click();

  // Scope to the layer list (the layer also renders a label on the map).
  const layerList = page.getByRole('listbox');
  await expect(layerList.getByText('Blue Marble', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(layerList.getByText('Temperature', { exact: true })).toBeVisible();
});

test('rejects a non-http(s) URL with an Invalid URL message', async ({ page }) => {
  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Load' }).click();

  await expect(page.getByText('Invalid URL')).toBeVisible({ timeout: 15000 });
});

test('filters and paginates the layer list', async ({ page }) => {
  await page.route('https://test-many.example/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/xml', body: WMS_MANY_LAYERS_XML });
  });

  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-many.example/wms');
  await page.getByRole('button', { name: 'Load' }).click();

  // 15 layers > one page → the pagination controls are shown.
  await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible({ timeout: 15000 });

  // Searching narrows the list to the single matching layer. Scope to the layer list, since the
  // active layer also renders its label on the map.
  const layerList = page.getByRole('listbox');
  await page.getByPlaceholder('Search layers…').fill('UniqueSearchTarget');
  await expect(layerList.getByText('UniqueSearchTarget', { exact: true })).toBeVisible();
  await expect(layerList.getByText('Common Layer 01', { exact: true })).toHaveCount(0);
});

test('selecting a layer marks it active and requests its tiles', async ({ page }) => {
  await page.route('https://test-wmts.example/**', (route) => {
    const url = route.request().url();
    if (url.includes('GetCapabilities')) {
      route.fulfill({ status: 200, contentType: 'application/xml', body: WMTS_CAPABILITIES_XML });
    } else {
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1x1 });
    }
  });

  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-wmts.example/wmts');
  await page.getByRole('button', { name: 'Load' }).click();
  await expect(page.getByText('Temperature', { exact: true })).toBeVisible({ timeout: 15000 });

  const tileRequest = page.waitForRequest(
    (r) => r.url().startsWith('https://test-wmts.example/tile/Temperature/'),
    { timeout: 15000 },
  );
  await page.getByRole('option', { name: 'Temperature' }).click();

  await tileRequest;
  await expect(page.getByRole('option', { name: 'Temperature', selected: true })).toBeVisible();
});

test('an added WMS server persists across a page reload', async ({ page }) => {
  await page.route('https://test-persist.example/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/xml', body: WMS_CAPABILITIES_XML });
  });

  await openExternalLayersForm(page);
  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-persist.example/wms');
  await page.getByRole('button', { name: 'Load' }).click();

  const layerList = page.getByRole('listbox');
  await expect(layerList.getByText('Cities', { exact: true })).toBeVisible({ timeout: 15000 });

  // The server is persisted to sessionStorage under the `browser_external_services` key (no
  // per-user suffix — anonymous servers live in the tab's sessionStorage, not localStorage).
  const stored = await page.evaluate(() => sessionStorage.getItem('browser_external_services'));
  expect(stored).not.toBeNull();
  expect(JSON.parse(stored as string).servers.length).toBeGreaterThan(0);

  // After a reload the slice is rehydrated from sessionStorage: reopening the WMS panel shows the
  // previously added server, and selecting it lists its layers again.
  await page.reload();
  const wmsButton = page.getByTitle('WMS/WMTS Panel');
  await wmsButton.waitFor({ state: 'visible', timeout: 30000 });
  await wmsButton.click();
  await page.getByPlaceholder('Enter a WMS or WMTS URL').waitFor({ state: 'visible', timeout: 15000 });

  const serverButton = page.locator('a.collection-button', { hasText: 'Test WMS Service' });
  await expect(serverButton).toBeVisible({ timeout: 15000 });
  await serverButton.click();
  await expect(page.getByRole('listbox').getByText('Cities', { exact: true })).toBeVisible({
    timeout: 15000,
  });
});
