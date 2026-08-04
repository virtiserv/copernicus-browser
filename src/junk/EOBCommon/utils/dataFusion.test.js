import {
  DATASET_CDAS_L8_L9_LOTL1,
  Landsat89CDASLOTL1Layer,
  DATASET_CDAS_S2L1C,
  S2L1CCDASLayer,
} from '@sentinel-hub/sentinelhub-js';

import { constructLayerFromDatasetId } from './dataFusion';

describe('constructLayerFromDatasetId', () => {
  test('constructs a Landsat89CDASLOTL1Layer for DATASET_CDAS_L8_L9_LOTL1', () => {
    const mosaickingOrder = 'mostRecent';
    const layer = constructLayerFromDatasetId(DATASET_CDAS_L8_L9_LOTL1.id, mosaickingOrder, {});
    expect(layer).not.toBeNull();
    expect(layer).toBeInstanceOf(Landsat89CDASLOTL1Layer);
    expect(layer.mosaickingOrder).toBe(mosaickingOrder);
  });

  test('constructs an S2L1CCDASLayer for DATASET_CDAS_S2L1C (regression check)', () => {
    const mosaickingOrder = 'leastRecent';
    const layer = constructLayerFromDatasetId(DATASET_CDAS_S2L1C.id, mosaickingOrder, {});
    expect(layer).not.toBeNull();
    expect(layer).toBeInstanceOf(S2L1CCDASLayer);
    expect(layer.mosaickingOrder).toBe(mosaickingOrder);
  });

  test('returns null for an unknown dataset id', () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const layer = constructLayerFromDatasetId('NOT_A_REAL_DATASET', 'mostRecent', {});
    expect(layer).toBeNull();
    expect(console.error).toHaveBeenCalledWith('Data fusion: unknown dataset');
    console.error.mockRestore();
  });
});
