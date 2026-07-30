import L from 'leaflet';

import { buildExternalWmsGetMapUrl, isAllExternalCompare, isMixedSourceCompare } from './WmsDownload.utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Leaflet LatLngBounds from explicit corners. */
function makeBounds(south: number, west: number, north: number, east: number): L.LatLngBounds {
  return L.latLngBounds([south, west], [north, east]);
}

/** Parse the query string portion of a URL produced by buildExternalWmsGetMapUrl. */
function parseParams(url: string): URLSearchParams {
  const qmark = url.indexOf('?');
  return new URLSearchParams(qmark === -1 ? '' : url.slice(qmark + 1));
}

// ---------------------------------------------------------------------------
// buildExternalWmsGetMapUrl (thin sentinelhub-js wrapper — WMS 1.1.1 only)
// ---------------------------------------------------------------------------

describe('buildExternalWmsGetMapUrl', () => {
  const bounds = makeBounds(40, 10, 50, 20);
  const baseUrl = 'https://example.com/wms';
  const layer = 'my_layer';

  test('emits WMS 1.1.1 with SRS EPSG:4326, lon/lat bbox, transparent PNG', () => {
    const url = buildExternalWmsGetMapUrl(baseUrl, layer, bounds, 800, 600);
    const p = parseParams(url);
    // sentinelhub-js uses lowercase OGC param keys.
    expect(p.get('version')).toBe('1.1.1');
    expect(p.get('srs')).toBe('EPSG:4326');
    expect(p.get('layers')).toBe(layer);
    expect(p.get('width')).toBe('800');
    expect(p.get('height')).toBe('600');
    expect(p.get('transparent')).toBe('true');
    // 1.1.1 EPSG:4326 is lon/lat order: west,south,east,north.
    expect(p.get('bbox')).toBe('10,40,20,50');
  });

  test('web-mercator mode requests EPSG:3857 with a projected metre bbox', () => {
    const url = buildExternalWmsGetMapUrl(baseUrl, layer, bounds, 800, 600, undefined, true);
    const p = parseParams(url);
    expect(p.get('srs')).toBe('EPSG:3857');
    const [minX, minY, maxX, maxY] = (p.get('bbox') as string).split(',').map(Number);
    expect(maxX).toBeGreaterThan(minX);
    expect(maxY).toBeGreaterThan(minY);
    expect(Math.abs(minX)).toBeGreaterThan(1000); // metres, far larger than any degree value
  });

  test('TIME is a single date value when supplied, absent otherwise', () => {
    expect(parseParams(buildExternalWmsGetMapUrl(baseUrl, layer, bounds, 800, 600)).has('time')).toBe(false);
    const url = buildExternalWmsGetMapUrl(baseUrl, layer, bounds, 800, 600, '2023-06-01T00:00:00Z');
    expect(parseParams(url).get('time')).toBe('2023-06-01');
  });
});

// ---------------------------------------------------------------------------
// isAllExternalCompare
// ---------------------------------------------------------------------------

describe('isAllExternalCompare', () => {
  test('returns false for undefined', () => {
    expect(isAllExternalCompare(undefined)).toBe(false);
  });

  test('returns false for empty array', () => {
    expect(isAllExternalCompare([])).toBe(false);
  });

  test('returns false when all items lack externalWms', () => {
    expect(isAllExternalCompare([{ name: 'A' }, { name: 'B' }])).toBe(false);
  });

  test('returns false when at least one item lacks externalWms', () => {
    expect(isAllExternalCompare([{ externalWms: { url: 'x' } }, { name: 'B' }])).toBe(false);
  });

  test('returns true when every item has externalWms (single element)', () => {
    expect(isAllExternalCompare([{ externalWms: { url: 'x' } }])).toBe(true);
  });

  test('returns true when every item has externalWms (multiple elements)', () => {
    expect(isAllExternalCompare([{ externalWms: { url: 'x' } }, { externalWms: { url: 'y' } }])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isMixedSourceCompare
// ---------------------------------------------------------------------------

describe('isMixedSourceCompare', () => {
  test('returns false for undefined', () => {
    expect(isMixedSourceCompare(undefined)).toBe(false);
  });

  test('returns false for empty array', () => {
    expect(isMixedSourceCompare([])).toBe(false);
  });

  test('returns false when all items have externalWms (all-external)', () => {
    expect(isMixedSourceCompare([{ externalWms: { url: 'x' } }, { externalWms: { url: 'y' } }])).toBe(false);
  });

  test('returns false when no items have externalWms (all-SH)', () => {
    expect(isMixedSourceCompare([{ name: 'A' }, { name: 'B' }])).toBe(false);
  });

  test('returns true for one external and one non-external', () => {
    expect(isMixedSourceCompare([{ externalWms: { url: 'x' } }, { name: 'B' }])).toBe(true);
  });

  test('returns true for one non-external and one external (opposite order)', () => {
    expect(isMixedSourceCompare([{ name: 'A' }, { externalWms: { url: 'x' } }])).toBe(true);
  });

  test('returns true when mixed across multiple items', () => {
    expect(
      isMixedSourceCompare([{ externalWms: { url: 'x' } }, { externalWms: { url: 'y' } }, { name: 'SH' }]),
    ).toBe(true);
  });
});
