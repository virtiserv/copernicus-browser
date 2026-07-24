import moment from 'moment';

import {
  createDatetimeInterval,
  createGeometryFilters,
  combineFilters,
  mapODataKeyToSTAC,
  createSTACSearchPayload,
} from './STACSearchPayloadBuilder';
import type { CQL2Filter } from './STACSearchPayloadBuilder';

describe('createDatetimeInterval', () => {
  test('returns null when timeInterval is null', () => {
    expect(createDatetimeInterval(null)).toBeNull();
  });

  test('leaves the interval open-ended (`..`) when only fromTime is set', () => {
    expect(createDatetimeInterval({ fromTime: '2023-06-29T00:00:00Z', toTime: null })).toBe(
      '2023-06-29T00:00:00Z/..',
    );
  });

  test('leaves the interval open-started (`..`) when only toTime is set', () => {
    expect(createDatetimeInterval({ fromTime: null, toTime: '2023-06-29T23:59:59Z' })).toBe(
      '../2023-06-29T23:59:59Z',
    );
  });

  test('returns a bounded interval when both fromTime and toTime are set', () => {
    expect(createDatetimeInterval({ fromTime: '2023-06-29T00:00:00Z', toTime: '2023-06-30T00:00:00Z' })).toBe(
      '2023-06-29T00:00:00Z/2023-06-30T00:00:00Z',
    );
  });

  test('falls back to a fully open interval (`../..`) when both fromTime and toTime are null', () => {
    expect(createDatetimeInterval({ fromTime: null, toTime: null })).toBe('../..');
  });
});

describe('createGeometryFilters', () => {
  test('returns an empty array for null geometry', () => {
    expect(createGeometryFilters(null)).toEqual([]);
  });

  test('returns an empty array for undefined geometry', () => {
    expect(createGeometryFilters(undefined)).toEqual([]);
  });

  test('returns an s_intersects filter for a real geometry', () => {
    const geometry = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [1, 1],
          [1, 2],
          [2, 2],
          [2, 1],
          [1, 1],
        ],
      ],
    };

    expect(createGeometryFilters(geometry)).toEqual([
      { op: 's_intersects', args: [{ property: 'geometry' }, geometry] },
    ]);
  });
});

describe('combineFilters', () => {
  test('returns undefined for an empty array', () => {
    expect(combineFilters([])).toBeUndefined();
  });

  test('returns the bare filter when there is exactly one', () => {
    const filter: CQL2Filter = { op: '=', args: [{ property: 'platform' }, 'landsat-8'] };
    expect(combineFilters([filter])).toEqual(filter);
  });

  test('wraps multiple filters in an `and` op', () => {
    const filterA: CQL2Filter = { op: '=', args: [{ property: 'platform' }, 'landsat-8'] };
    const filterB: CQL2Filter = { op: 's_intersects', args: [{ property: 'geometry' }, {}] };

    expect(combineFilters([filterA, filterB])).toEqual({ op: 'and', args: [filterA, filterB] });
  });
});

describe('mapODataKeyToSTAC', () => {
  test('maps processingMode to product:timeliness_category', () => {
    expect(mapODataKeyToSTAC('processingMode')).toBe('product:timeliness_category');
  });

  test('maps orbitNumber to sat:absolute_orbit', () => {
    expect(mapODataKeyToSTAC('orbitNumber')).toBe('sat:absolute_orbit');
  });

  test('passes an unmapped key through unchanged', () => {
    expect(mapODataKeyToSTAC('cloudCoverPercentage')).toBe('cloudCoverPercentage');
  });
});

describe('createSTACSearchPayload', () => {
  test('with no selected collections, no dates and no search criteria: sets an open datetime and no filter', () => {
    const payload = createSTACSearchPayload({
      collectionForm: { selectedCollections: {} },
    });

    expect(payload).toEqual({ limit: 50, datetime: '../..' });
    expect(payload.filter).toBeUndefined();
    expect(payload.collections).toBeUndefined();
  });

  test('builds a `=` platform filter for a single selected collection', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: { platform: 'sentinel-2a' },
        },
      },
    });

    expect(payload.filter).toEqual({ op: '=', args: [{ property: 'platform' }, 'sentinel-2a'] });
  });

  test('builds an `in` platform filter when multiple collections are selected', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2A: { platform: 'sentinel-2a' },
          S2B: { platform: 'sentinel-2b' },
        },
      },
    });

    expect(payload.filter).toEqual({
      op: 'in',
      args: [{ property: 'platform' }, ['sentinel-2a', 'sentinel-2b']],
    });
  });

  test('populates the top-level `collections` param via a direct collectionName match', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: { platform: 'sentinel-2a' },
        },
      },
      collectionFormConfig: [{ id: 'S2', collectionName: 'SENTINEL-2' }],
    });

    expect(payload.collections).toEqual(['SENTINEL-2']);
  });

  test('populates `collections` for a group node via its sub-collection items', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          COMPLEMENTARY_DATA: {
            type: 'group',
            'LANDSAT-8': { type: 'collection' },
            'LANDSAT-9': { type: 'collection' },
          },
        },
      },
      collectionFormConfig: [
        {
          id: 'COMPLEMENTARY_DATA',
          items: [
            { id: 'LANDSAT-8', collectionName: 'LANDSAT8' },
            { id: 'LANDSAT-9', collectionName: 'LANDSAT9' },
          ],
        },
      ],
    });

    expect(payload.collections).toEqual(['LANDSAT8', 'LANDSAT9']);
  });

  test('does not add a `collections` param when collectionFormConfig is not provided', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: { platform: 'sentinel-2a' },
        },
      },
    });

    expect(payload.collections).toBeUndefined();
  });

  test('extracts product type and instrument filters from nested selectedCollections', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: {
            platform: 'sentinel-2a',
            MSI: {
              type: 'instrument',
              L1C: { type: 'productType' },
            },
          },
        },
      },
      collectionFormConfig: [
        { id: 'S2', collectionName: 'SENTINEL-2', items: [{ id: 'MSI', supportsInstrumentName: true }] },
      ],
    });

    expect(payload.filter).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'platform' }, 'sentinel-2a'] },
        { op: '=', args: [{ property: 'product:type' }, 'L1C'] },
        { op: '=', args: [{ property: 'instruments' }, 'MSI'] },
      ],
    });
  });

  test('builds `in` product type / instrument filters when there is more than one of each', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: {
            platform: 'sentinel-2a',
            MSI: {
              type: 'instrument',
              L1C: { type: 'productType' },
              L2A: { type: 'productType' },
            },
            MSI2: {
              type: 'instrument',
            },
          },
        },
      },
      collectionFormConfig: [
        {
          id: 'S2',
          collectionName: 'SENTINEL-2',
          items: [
            { id: 'MSI', supportsInstrumentName: true },
            { id: 'MSI2', supportsInstrumentName: true },
          ],
        },
      ],
    });

    expect(payload.filter).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'platform' }, 'sentinel-2a'] },
        { op: 'in', args: [{ property: 'product:type' }, ['L1C', 'L2A']] },
        { op: 'in', args: [{ property: 'instruments' }, ['MSI', 'MSI2']] },
      ],
    });
  });

  test('omits instrument filters when the collection config sets supportsInstrumentName to false', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: {
            platform: 'sentinel-2a',
            MSI: {
              type: 'instrument',
              L1C: { type: 'productType' },
            },
          },
        },
      },
      collectionFormConfig: [
        {
          id: 'S2',
          collectionName: 'SENTINEL-2',
          supportsInstrumentName: false,
          items: [{ id: 'MSI' }],
        },
      ],
    });

    // Product type filter still included; instrument filter is gated off at the collection level.
    expect(payload.filter).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'platform' }, 'sentinel-2a'] },
        { op: '=', args: [{ property: 'product:type' }, 'L1C'] },
      ],
    });
  });

  test('omits instrument filters when the instrument config sets supportsInstrumentName to false', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: {
            MSI: {
              type: 'instrument',
              L1C: { type: 'productType' },
            },
          },
        },
      },
      collectionFormConfig: [
        {
          id: 'S2',
          collectionName: 'SENTINEL-2',
          items: [{ id: 'MSI', supportsInstrumentName: false }],
        },
      ],
    });

    expect(payload.filter).toEqual({ op: '=', args: [{ property: 'product:type' }, 'L1C'] });
  });

  test('omits instrument filters when supportsInstrumentName is false, even with a platform key present', () => {
    // Regression test: the instrument-level gate in shouldIncludeInstruments used to inspect
    // every key of the collection node, including non-instrument metadata keys like `platform`
    // (present on every real selected collection). Since it used .some(), a non-instrument key
    // would short-circuit the gate to true regardless of the actual instrument's config,
    // silently including instrument filters that should have been suppressed. Only
    // instrument-type keys must be considered.
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: {
            platform: 'sentinel-2a',
            MSI: {
              type: 'instrument',
              L1C: { type: 'productType' },
            },
          },
        },
      },
      collectionFormConfig: [
        {
          id: 'S2',
          collectionName: 'SENTINEL-2',
          items: [{ id: 'MSI', supportsInstrumentName: false }],
        },
      ],
    });

    expect(payload.filter).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'platform' }, 'sentinel-2a'] },
        { op: '=', args: [{ property: 'product:type' }, 'L1C'] },
      ],
    });
  });

  test('createAdditionalFilters: builds `=` filters for scalar values and translates mapped keys', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {},
        selectedFilters: {
          S2: {
            processingMode: 'NRT',
            cloudCoverPercentage: 50,
          },
        },
      },
    });

    expect(payload.filter).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'product:timeliness_category' }, 'NRT'] },
        { op: '=', args: [{ property: 'cloudCoverPercentage' }, 50] },
      ],
    });
  });

  test('createAdditionalFilters: unwraps a single-item array of {value} objects into a `=` filter', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {},
        selectedFilters: {
          S2: {
            customTag: [{ value: 'only-one' }],
          },
        },
      },
    });

    expect(payload.filter).toEqual({ op: '=', args: [{ property: 'customTag' }, 'only-one'] });
  });

  test('createAdditionalFilters: unwraps a multi-item array of {value} objects into an `in` filter and translates the key', () => {
    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {},
        selectedFilters: {
          S2: {
            orbitNumber: [{ value: 10 }, { value: 20 }],
          },
        },
      },
    });

    expect(payload.filter).toEqual({
      op: 'in',
      args: [{ property: 'sat:absolute_orbit' }, [10, 20]],
    });
  });

  test('searchCriteria: builds a `like` filter on title and suppresses the datetime interval', () => {
    const payload = createSTACSearchPayload({
      collectionForm: { selectedCollections: {} },
      searchCriteria: 'S2A_MSIL1C',
      fromMoment: moment.utc('2023-06-29T00:00:00.000Z'),
      toMoment: moment.utc('2023-06-30T00:00:00.000Z'),
    });

    expect(payload.filter).toEqual({ op: 'like', args: [{ property: 'title' }, '%S2A_MSIL1C%'] });
    expect(payload.datetime).toBeUndefined();
  });

  test('without searchCriteria, the datetime interval is included even when fromMoment/toMoment are unset', () => {
    const payload = createSTACSearchPayload({
      collectionForm: { selectedCollections: {} },
    });

    expect(payload.datetime).toBe('../..');
  });

  test('builds the datetime interval from fromMoment/toMoment when no filterMonths are set', () => {
    const payload = createSTACSearchPayload({
      collectionForm: { selectedCollections: {} },
      fromMoment: moment.utc('2023-06-29T00:00:00.000Z'),
      toMoment: moment.utc('2023-06-29T23:59:59.999Z'),
    });

    expect(payload.datetime).toBe('2023-06-29T00:00:00Z/2023-06-29T23:59:59Z');
  });

  test('filterMonths: delegates to applyFilterMonthsToDateRange and uses the first returned interval', () => {
    const fromMoment = moment.utc('2023-01-01T00:00:00.000Z');
    const toMoment = moment.utc('2023-12-31T23:59:59.999Z');
    const filterMonths = [6, 7, 8];
    const applyFilterMonthsToDateRange = jest.fn(() => [
      {
        fromMoment: moment.utc('2023-06-01T00:00:00.000Z'),
        toMoment: moment.utc('2023-08-31T23:59:59.999Z'),
      },
    ]);

    const payload = createSTACSearchPayload({
      collectionForm: { selectedCollections: {} },
      fromMoment,
      toMoment,
      filterMonths,
      applyFilterMonthsToDateRange,
    });

    expect(applyFilterMonthsToDateRange).toHaveBeenCalledWith(fromMoment, toMoment, filterMonths);
    expect(payload.datetime).toBe('2023-06-01T00:00:00.000Z/2023-08-31T23:59:59.999Z');
  });

  test('filterMonths: omits the datetime interval when applyFilterMonthsToDateRange returns no intervals', () => {
    const applyFilterMonthsToDateRange = jest.fn(() => []);

    const payload = createSTACSearchPayload({
      collectionForm: { selectedCollections: {} },
      filterMonths: [6, 7, 8],
      applyFilterMonthsToDateRange,
    });

    expect(payload.datetime).toBeUndefined();
  });

  test('adds an s_intersects geometry filter derived from aoiBounds when collections are selected', () => {
    const aoiBounds = {
      _southWest: { lat: 1, lng: 1 },
      _northEast: { lat: 2, lng: 2 },
    };

    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: { platform: 'sentinel-2a' },
        },
      },
      aoiBounds,
    });

    expect(payload.filter).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'platform' }, 'sentinel-2a'] },
        {
          op: 's_intersects',
          args: [
            { property: 'geometry' },
            {
              type: 'Polygon',
              coordinates: [
                [
                  [1, 1],
                  [2, 1],
                  [2, 2],
                  [1, 2],
                  [1, 1],
                ],
              ],
            },
          ],
        },
      ],
    });
  });

  test('combines platform, geometry, product type/instrument, additional and search filters with `and`', () => {
    const aoiBounds = {
      _southWest: { lat: 1, lng: 1 },
      _northEast: { lat: 2, lng: 2 },
    };

    const payload = createSTACSearchPayload({
      collectionForm: {
        selectedCollections: {
          S2: {
            platform: 'sentinel-2a',
            MSI: {
              type: 'instrument',
              L1C: { type: 'productType' },
            },
          },
        },
        selectedFilters: {
          S2: {
            processingMode: 'NRT',
          },
        },
      },
      collectionFormConfig: [
        { id: 'S2', collectionName: 'SENTINEL-2', items: [{ id: 'MSI', supportsInstrumentName: true }] },
      ],
      aoiBounds,
      searchCriteria: 'S2A',
    });

    expect(payload.collections).toEqual(['SENTINEL-2']);
    expect(payload.datetime).toBeUndefined();
    expect(payload.filter).toEqual({
      op: 'and',
      args: [
        { op: '=', args: [{ property: 'platform' }, 'sentinel-2a'] },
        {
          op: 's_intersects',
          args: [
            { property: 'geometry' },
            {
              type: 'Polygon',
              coordinates: [
                [
                  [1, 1],
                  [2, 1],
                  [2, 2],
                  [1, 2],
                  [1, 1],
                ],
              ],
            },
          ],
        },
        { op: '=', args: [{ property: 'product:type' }, 'L1C'] },
        { op: '=', args: [{ property: 'instruments' }, 'MSI'] },
        { op: '=', args: [{ property: 'product:timeliness_category' }, 'NRT'] },
        { op: 'like', args: [{ property: 'title' }, '%S2A%'] },
      ],
    });
  });
});
