import { getPreselectedDatasetId } from './PreselectedCollectionProvider';
import { getAllAvailableCollections } from '../Tools/SearchPanel/dataSourceHandlers/dataSourceHandlers';
import { S2_L2A_CDAS, S2_L1C_CDAS } from '../Tools/SearchPanel/dataSourceHandlers/dataSourceConstants';

jest.mock('../Tools/SearchPanel/dataSourceHandlers/dataSourceHandlers', () => ({
  getAllAvailableCollections: jest.fn(),
  getDataSourceHandler: jest.fn(),
}));

describe('getPreselectedDatasetId', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('prefers S2_L2A_CDAS when available, regardless of the fallback flag', () => {
    getAllAvailableCollections.mockReturnValue(['SOME_OTHER_DATASET', S2_L2A_CDAS]);

    expect(getPreselectedDatasetId(false)).toBe(S2_L2A_CDAS);
  });

  it('falls back to S2_L1C_CDAS when S2_L2A_CDAS is not available', () => {
    getAllAvailableCollections.mockReturnValue(['SOME_OTHER_DATASET', S2_L1C_CDAS]);

    expect(getPreselectedDatasetId(false)).toBe(S2_L1C_CDAS);
  });

  it('does not fall back to an arbitrary collection when allowAnyCollectionFallback is false', () => {
    getAllAvailableCollections.mockReturnValue(['SOME_OTHER_DATASET']);

    expect(getPreselectedDatasetId(false)).toBeUndefined();
  });

  it('falls back to the first available collection when allowAnyCollectionFallback is true', () => {
    getAllAvailableCollections.mockReturnValue(['SOME_OTHER_DATASET']);

    expect(getPreselectedDatasetId(true)).toBe('SOME_OTHER_DATASET');
  });

  it('defaults allowAnyCollectionFallback to true when not provided', () => {
    getAllAvailableCollections.mockReturnValue(['SOME_OTHER_DATASET']);

    expect(getPreselectedDatasetId()).toBe('SOME_OTHER_DATASET');
  });
});
