import { test, expect, Page } from '@playwright/test';

// Authenticated spec (no .noauth suffix) — runs under the `chromium` project with the stored SSO
// session, so the app treats the user as logged in (userdata + access_token present). That is the
// gate the backend-sync feature (MR 1167) is built on: logged-in users hydrate their external
// WMS/WMTS servers from `userexternalservers` on mount and full-array-PUT them back on every mutation.
//
// The real `userexternalservers` backend is mocked with page.route so the test asserts the exact GET/PUT
// contract deterministically, independent of whether the local backend is running.

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

// A server the UI never adds in-session; used to prove the panel is populated from the backend GET
// (not from localStorage). Shape mirrors ExternalServer well enough for the slice to render a button.
const BACKEND_SEEDED_SERVER = {
  id: 'seeded-server-id',
  name: 'Backend Seeded WMS',
  url: 'https://seeded-wms.example/wms',
  type: 'WMS',
  version: '1.1.1',
  format: 'image/png',
  infoFormat: 'text/html',
  layers: [{ name: 'seeded', title: 'Seeded Layer', queryable: false }],
};

// Installs a stateful mock of the userexternalservers backend. `servers` is the durable list held
// "server-side"; GET returns it, PUT replaces it. Returns handles to inspect PUT traffic.
function mockUserServicesBackend(page: Page, initial: unknown[] = []) {
  const state = { servers: initial, putCount: 0, lastPutBody: null as any };
  return page.route('**/userexternalservers**', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: state.servers }),
      });
      return;
    }
    if (method === 'PUT') {
      state.putCount += 1;
      state.lastPutBody = route.request().postDataJSON();
      state.servers = state.lastPutBody?.items ?? [];
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      return;
    }
    await route.fallback();
  }).then(() => state);
}

async function openWmsPanel(page: Page) {
  const wmsButton = page.getByTitle('WMS/WMTS Panel');
  await wmsButton.waitFor({ state: 'visible', timeout: 30000 });
  await wmsButton.click();
}

test('hydrates external servers from the backend GET on mount', async ({ page }) => {
  await mockUserServicesBackend(page, [BACKEND_SEEDED_SERVER]);

  await page.goto('/');
  await openWmsPanel(page);

  // The server was only ever returned by the backend GET, never added through the UI, so seeing it
  // proves backend hydration drives the panel. Scope to the collection button — the active-layer
  // title label also carries the same title text once the hydrated server is auto-selected.
  await expect(page.locator('a.collection-button', { hasText: 'Backend Seeded WMS' })).toBeVisible({
    timeout: 20000,
  });
});

test('adding a server PUTs the full server array to the backend, and transient actions do not', async ({
  page,
}) => {
  const backend = await mockUserServicesBackend(page, []);
  await page.route('https://test-wms.example/**', (route) => {
    route.fulfill({ status: 200, contentType: 'application/xml', body: WMS_CAPABILITIES_XML });
  });

  await page.goto('/');
  await openWmsPanel(page);

  const putBefore = backend.putCount;

  await page.getByPlaceholder('Enter a WMS or WMTS URL').fill('https://test-wms.example/wms');
  await page.getByRole('button', { name: 'Load' }).click();

  // The layer list appears once capabilities load, confirming the add succeeded.
  const layerList = page.getByRole('listbox');
  await expect(layerList.getByText('Cities', { exact: true })).toBeVisible({ timeout: 20000 });

  // The add (addExternalServer) must have triggered exactly one PUT carrying the new server.
  await expect.poll(() => backend.putCount, { timeout: 15000 }).toBeGreaterThan(putBefore);
  expect(Array.isArray(backend.lastPutBody?.items)).toBe(true);
  expect(backend.lastPutBody.items).toHaveLength(1);
  expect(backend.lastPutBody.items[0]).toMatchObject({ type: 'WMS' });
  expect(backend.lastPutBody.items[0].url).toContain('test-wms.example');

  // Regression: selecting a layer is transient UI state (setActiveExternalLayer) and must NOT PUT.
  const putAfterAdd = backend.putCount;
  await layerList.getByText('Borders', { exact: true }).click();
  // Selection and any fire-and-forget save are dispatched in the same middleware tick, so once
  // the layer is marked selected, an erroneous PUT (if any) is already recorded.
  await expect(layerList.getByRole('option', { name: 'Borders', selected: true })).toBeVisible({
    timeout: 15000,
  });
  expect(backend.putCount).toBe(putAfterAdd);
});
