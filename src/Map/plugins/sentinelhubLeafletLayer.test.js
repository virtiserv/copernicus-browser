import isEqual from 'fast-deep-equal';

// sentinelhubLeafletLayer.jsx pulls in dataSourceHandlers.jsx, which eagerly constructs every
// registered data source handler on import — unrelated to getSentinelHubOptions and prone to a
// pre-existing circular-import break (DataSourceHandler.js <-> dataSourceHandlers.jsx) when this
// test file is Jest's entry point. Mock it out so only the code under test runs.
jest.mock('../../Tools/SearchPanel/dataSourceHandlers/dataSourceHandlers', () => ({
  checkIfCustom: jest.fn(),
  getDataSourceHandler: jest.fn(),
}));

import { getSentinelHubOptions } from './sentinelhubLeafletLayer';

describe('getSentinelHubOptions', () => {
  test('omits zIndex from the diffed params, so changing only zIndex keeps isEqual true', () => {
    const baseParams = { datasetId: 'S2L2A', layers: 'TRUE_COLOR', opacity: 1 };

    const prevParams = getSentinelHubOptions({ ...baseParams, zIndex: 501 });
    const params = getSentinelHubOptions({ ...baseParams, zIndex: 502 });

    // componentDidUpdate only calls instance.setParams() (a full tile redraw) when this is false.
    // zIndex changes are applied separately via instance.setZIndex(), so it must not leak in here.
    expect(isEqual(params, prevParams)).toBe(true);
    expect('zIndex' in params).toBe(false);
  });
});
