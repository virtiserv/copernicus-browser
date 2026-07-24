import { LayersFactory } from '@sentinel-hub/sentinelhub-js';

import store, { notificationSlice } from '../../../store';
import { QUOTA_ERROR_MESSAGE } from '../../../utils';
import {
  prepareThemeDataSourceHandlers,
  getDataSourceHandler,
  isDataSourceReadyForDataset,
} from './dataSourceHandlers';
import { S2_L2A_CDAS } from './dataSourceConstants';

const QUOTA_ERROR = { status: 403, code: 'ACCESS_INSUFFICIENT_PROCESSING_UNITS' };

const testTheme = {
  name: 'test-theme',
  content: [
    { service: 'WMS', url: 'https://services.sentinel-hub.com/ogc/wms/some-instance-id', name: 'part-a' },
  ],
};

describe('prepareThemeDataSourceHandlers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    store.dispatch(notificationSlice.actions.reset());
  });

  it('reports a quota error via the notification panel instead of failing the theme part', async () => {
    jest.spyOn(LayersFactory, 'makeLayers').mockRejectedValue(QUOTA_ERROR);
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const failedThemeParts = await prepareThemeDataSourceHandlers(testTheme, 0);

    expect(store.getState().notification.panelError).toEqual(QUOTA_ERROR_MESSAGE);
    expect(console.error).not.toHaveBeenCalledWith(
      expect.stringContaining('Error retrieving additional data'),
    );
    expect(failedThemeParts).toEqual([]);
  });
});

describe('isDataSourceReadyForDataset', () => {
  it('returns false when the handler exists but has not resolved this dataset yet', () => {
    expect(isDataSourceReadyForDataset(S2_L2A_CDAS)).toBe(false);
  });

  it('returns true once the handler has resolved this dataset', () => {
    getDataSourceHandler(S2_L2A_CDAS).datasets.push(S2_L2A_CDAS);

    expect(isDataSourceReadyForDataset(S2_L2A_CDAS)).toBe(true);
  });

  it('returns false when no handler matches the dataset id', () => {
    expect(isDataSourceReadyForDataset('totally-unknown-dataset-id-xyz')).toBe(false);
  });
});

