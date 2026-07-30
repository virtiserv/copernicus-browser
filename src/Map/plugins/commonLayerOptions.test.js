import { getCommonLayerOptions } from './commonLayerOptions';

describe('getCommonLayerOptions', () => {
  test('returns an options object with the default null fields when params is empty', () => {
    const options = getCommonLayerOptions({});
    expect(options).toEqual({
      minQa: null,
      mosaickingOrder: null,
      upsampling: null,
      downsampling: null,
      speckleFilter: null,
      orthorectification: null,
      backscatterCoeff: null,
      orbitDirection: null,
    });
  });

  test('never includes zIndex, since it is applied via setZIndex outside the diffed params', () => {
    const options = getCommonLayerOptions({ zIndex: 7 });
    expect('zIndex' in options).toBe(false);
  });
});
