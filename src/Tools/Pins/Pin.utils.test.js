import {
  isOnEqualDate,
  constructTimespanString,
  constructCompareTimespanString,
  normalizePin,
  layerFromPin,
} from './Pin.utils';
import { LayersFactory } from '@sentinel-hub/sentinelhub-js';
import { getDataSourceHandler } from '../SearchPanel/dataSourceHandlers/dataSourceHandlers';

jest.mock('@sentinel-hub/sentinelhub-js', () => ({
  ...jest.requireActual('@sentinel-hub/sentinelhub-js'),
  LayersFactory: { makeLayers: jest.fn() },
}));

jest.mock('../SearchPanel/dataSourceHandlers/dataSourceHandlers', () => ({
  ...jest.requireActual('../SearchPanel/dataSourceHandlers/dataSourceHandlers'),
  getDataSourceHandler: jest.fn(),
}));

describe('isOnEqualDate', () => {
  it('should return true when both dates are on the same date', () => {
    const date1 = '2019-08-17T00:00:00.000Z';
    const date2 = '2019-08-17T23:59:59.999Z';
    const isEqualDate = isOnEqualDate(date1, date2);
    expect(isEqualDate).toBe(true);
  });

  it('should return false when both dates have the same day but different months and years', () => {
    const date1 = '2019-08-17T00:00:00.000Z';
    const date2 = '2020-10-17T23:59:59.999Z';
    const isEqualDate = isOnEqualDate(date1, date2);
    expect(isEqualDate).toBe(false);
  });

  it('should return false when both dates have the same day and month but different years', () => {
    const date1 = '2019-08-17T00:00:00.000Z';
    const date2 = '2020-08-17T23:59:59.999Z';
    const isEqualDate = isOnEqualDate(date1, date2);
    expect(isEqualDate).toBe(false);
  });
});

describe('constructTimespanString', () => {
  it('should return a string with timespan of dates when fromTime and toTime are not on the same date', () => {
    const testPin = {
      fromTime: '2019-08-17T00:00:00.000Z',
      toTime: '2019-08-18T23:59:59.999Z',
    };

    const date = constructTimespanString(testPin);
    expect(date).toEqual('2019-08-17 - 2019-08-18');
  });

  it('should return a single date string when the dates are on the same day', () => {
    const testPin = {
      fromTime: '2019-08-18T00:00:00.000Z',
      toTime: '2019-08-18T23:59:59.999Z',
    };
    const date = constructTimespanString(testPin);
    expect(date).toEqual('2019-08-18');
  });

  it('should return a single date string when only toTime is passed', () => {
    const testPin = {
      toTime: '2019-08-18T23:59:59.999Z',
    };
    const date = constructTimespanString(testPin);
    expect(date).toEqual('2019-08-18');
  });

  it('should return null when fromTime and toTime are not defined', () => {
    const testPin = {};
    const date = constructTimespanString(testPin);
    expect(date).toEqual(null);
  });

  it('should return null when a pin is not passed', () => {
    const date = constructTimespanString();
    expect(date).toBe(null);
  });
});

describe('constructCompareTimespanString', () => {
  it('returns min fromTime / max toTime across layers with / separator', () => {
    const comparedLayers = [
      { fromTime: '2019-08-17T00:00:00.000Z', toTime: '2019-08-17T23:59:59.999Z' },
      { fromTime: '2022-04-01T00:00:00.000Z', toTime: '2022-04-01T23:59:59.999Z' },
    ];
    expect(constructCompareTimespanString(comparedLayers)).toEqual('2019-08-17 / 2022-04-01');
  });

  it('returns a single date when all layers fall on the same day', () => {
    const comparedLayers = [
      { fromTime: '2019-08-18T00:00:00.000Z', toTime: '2019-08-18T23:59:59.999Z' },
      { fromTime: '2019-08-18T06:00:00.000Z', toTime: '2019-08-18T23:59:59.999Z' },
    ];
    expect(constructCompareTimespanString(comparedLayers)).toEqual('2019-08-18');
  });

  it('returns null when comparedLayers is empty', () => {
    expect(constructCompareTimespanString([])).toBeNull();
  });

  it('returns null when called without arguments', () => {
    expect(constructCompareTimespanString()).toBeNull();
  });
});

describe('normalizePin', () => {
  it('preserves evalscriptUrl when already present', () => {
    const pin = { evalscriptUrl: 'https://example.com/eval' };
    const result = normalizePin(pin);
    expect(result.evalscriptUrl).toBe('https://example.com/eval');
  });

  it('preserves processGraphUrl when already present', () => {
    const pin = { processGraphUrl: 'https://example.com/pg' };
    const result = normalizePin(pin);
    expect(result.processGraphUrl).toBe('https://example.com/pg');
  });

  it('promotes legacy lowercase evalscripturl to evalscriptUrl', () => {
    const pin = { evalscripturl: 'https://example.com/eval' };
    const result = normalizePin(pin);
    expect(result.evalscriptUrl).toBe('https://example.com/eval');
  });

  it('promotes legacy lowercase processgraphurl to processGraphUrl', () => {
    const pin = { processgraphurl: 'https://example.com/pg' };
    const result = normalizePin(pin);
    expect(result.processGraphUrl).toBe('https://example.com/pg');
  });

  it('prefers camelCase evalscriptUrl over legacy lowercase evalscripturl', () => {
    const pin = { evalscriptUrl: 'new', evalscripturl: 'old' };
    const result = normalizePin(pin);
    expect(result.evalscriptUrl).toBe('new');
  });

  it('prefers camelCase processGraphUrl over legacy lowercase processgraphurl', () => {
    const pin = { processGraphUrl: 'new-pg', processgraphurl: 'old-pg' };
    const result = normalizePin(pin);
    expect(result.processGraphUrl).toBe('new-pg');
  });

  it('leaves evalscriptUrl undefined when neither key is present', () => {
    const pin = { someOtherProp: 'value' };
    const result = normalizePin(pin);
    expect(result.evalscriptUrl).toBeUndefined();
    expect(result.processGraphUrl).toBeUndefined();
  });

  it('clears processGraph and processGraphUrl when evalscriptUrl is present', () => {
    const pin = {
      evalscriptUrl: 'https://example.com/eval',
      processGraph: '{"some":"graph"}',
      processGraphUrl: 'https://example.com/pg',
    };
    const result = normalizePin(pin);
    expect(result.evalscriptUrl).toBe('https://example.com/eval');
    expect(result.processGraph).toBeUndefined();
    expect(result.processGraphUrl).toBeUndefined();
  });

  it('clears evalscript when processGraphUrl is present and no evalscriptUrl', () => {
    const pin = {
      processGraphUrl: 'https://example.com/pg',
      evalscript: 'return [1,1,1]',
    };
    const result = normalizePin(pin);
    expect(result.processGraphUrl).toBe('https://example.com/pg');
    expect(result.evalscript).toBeUndefined();
    expect(result.evalscriptUrl).toBeUndefined();
  });

  it('evalscriptUrl takes precedence over processGraphUrl when both are present', () => {
    const pin = {
      evalscriptUrl: 'https://example.com/eval',
      processGraphUrl: 'https://example.com/pg',
    };
    const result = normalizePin(pin);
    expect(result.evalscriptUrl).toBe('https://example.com/eval');
    expect(result.processGraphUrl).toBeUndefined();
  });

  it('removes legacy lowercase evalscripturl and processgraphurl keys from the result', () => {
    const pin = {
      evalscripturl: 'https://example.com/eval',
      processgraphurl: 'https://example.com/pg',
    };
    const result = normalizePin(pin);
    expect(result.evalscriptUrl).toBe('https://example.com/eval');
    expect('evalscripturl' in result).toBe(false);
    expect('processgraphurl' in result).toBe(false);
  });
});

describe('layerFromPin — low-resolution BYOC collection lookup (regression #1154)', () => {
  // Mirrors real CLMS VLCC/byLayer datasets where the WMS layer's collectionId differs
  // from the pin's datasetId — the low-resolution helpers must be keyed by collectionId.
  const collectionId = 'byoc-collection-uuid-123';
  const datasetId = 'COPERNICUS_CLMS_SOME_DATASET_ID';
  const layerId = 'SOME_LAYER';

  let dsh;
  let mockLayer;

  beforeEach(() => {
    mockLayer = {
      layerId,
      collectionId,
      updateLayerFromServiceIfNeeded: jest.fn().mockResolvedValue(undefined),
    };
    dsh = {
      getSentinelHubDataset: jest.fn(() => null),
      supportsLowResolutionAlternativeCollection: jest.fn((id) => id === collectionId),
      getLowResolutionCollectionId: jest.fn((id) =>
        id === collectionId ? 'low-res-collection-uuid-456' : undefined,
      ),
      getLowResolutionMetersPerPixelThreshold: jest.fn((id) => (id === collectionId ? 300 : undefined)),
    };
    getDataSourceHandler.mockReturnValue(dsh);
    LayersFactory.makeLayers.mockResolvedValue([mockLayer]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls the low-resolution collection helpers with the layer collectionId, not the dataset id, and applies the low-res values to the layer', async () => {
    const pin = { datasetId, layerId, visualizationUrl: 'https://example.com/wms' };

    const layer = await layerFromPin(pin, {});

    expect(dsh.supportsLowResolutionAlternativeCollection).toHaveBeenCalledWith(collectionId);
    expect(dsh.supportsLowResolutionAlternativeCollection).not.toHaveBeenCalledWith(datasetId);
    expect(dsh.getLowResolutionCollectionId).toHaveBeenCalledWith(collectionId);
    expect(dsh.getLowResolutionCollectionId).not.toHaveBeenCalledWith(datasetId);
    expect(dsh.getLowResolutionMetersPerPixelThreshold).toHaveBeenCalledWith(collectionId);
    expect(dsh.getLowResolutionMetersPerPixelThreshold).not.toHaveBeenCalledWith(datasetId);

    expect(layer.lowResolutionCollectionId).toBe('low-res-collection-uuid-456');
    expect(layer.lowResolutionMetersPerPixelThreshold).toBe(300);
  });

  it('does not set low-resolution fields when the handler does not support a low-res alternative for the collectionId', async () => {
    dsh.supportsLowResolutionAlternativeCollection.mockReturnValue(false);
    const pin = { datasetId, layerId, visualizationUrl: 'https://example.com/wms' };

    const layer = await layerFromPin(pin, {});

    expect(dsh.supportsLowResolutionAlternativeCollection).toHaveBeenCalledWith(collectionId);
    expect(layer.lowResolutionCollectionId).toBeUndefined();
    expect(layer.lowResolutionMetersPerPixelThreshold).toBeUndefined();
  });
});
