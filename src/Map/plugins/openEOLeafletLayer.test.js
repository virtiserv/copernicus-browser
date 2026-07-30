import isEqual from 'fast-deep-equal';
import { getOpenEoOptions } from './openEOLeafletLayer';

describe('getOpenEoOptions', () => {
  test('omits zIndex from the diffed params, so changing only zIndex keeps isEqual true', () => {
    const baseParams = { processGraph: { process_graph: {} }, opacity: 1 };

    const prevParams = getOpenEoOptions({ ...baseParams, zIndex: 501 });
    const params = getOpenEoOptions({ ...baseParams, zIndex: 502 });

    // componentDidUpdate only calls instance.setParams() (a full tile redraw) when this is false.
    // zIndex changes are applied separately via instance.setZIndex(), so it must not leak in here.
    expect(isEqual(params, prevParams)).toBe(true);
    expect('zIndex' in params).toBe(false);
  });
});
