import { resolveHydratedExternalLayers } from './hydrateExternalServers';
import {
  loadPersistedExternalLayers,
  loadPersistedServers,
  clearPersistedExternalLayers,
} from './externalLayersPersistence';
import { getExternalServersFromServer, saveExternalServersToServer } from './externalServicesBackend';
import { externalLayersSlice, ExternalServer } from '../store/slices/externalLayersSlice';

jest.mock('./externalLayersPersistence');
jest.mock('./externalServicesBackend', () => {
  const actual = jest.requireActual('./externalServicesBackend');
  return {
    ...actual,
    getExternalServersFromServer: jest.fn(),
    saveExternalServersToServer: jest.fn(),
  };
});

const mockLoadPersistedExternalLayers = loadPersistedExternalLayers as jest.Mock;
const mockLoadPersistedServers = loadPersistedServers as jest.Mock;
const mockClearPersistedExternalLayers = clearPersistedExternalLayers as jest.Mock;
const mockGetExternalServersFromServer = getExternalServersFromServer as jest.Mock;
const mockSaveExternalServersToServer = saveExternalServersToServer as jest.Mock;

const server = (id: string): ExternalServer => ({
  id,
  name: `Server ${id}`,
  url: `https://wms.example/${id}`,
  type: 'WMS',
  layers: [],
});

describe('resolveHydratedExternalLayers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadPersistedServers.mockReturnValue([]);
  });

  it('reads only from the anonymous session bucket when the user is not logged in', async () => {
    const persisted = { ...externalLayersSlice.getInitialState(), servers: [server('s1')] };
    mockLoadPersistedExternalLayers.mockReturnValue(persisted);

    const result = await resolveHydratedExternalLayers(false, undefined);

    expect(result).toBe(persisted);
    expect(mockGetExternalServersFromServer).not.toHaveBeenCalled();
  });

  it('uses the backend servers as-is when there is no anonymous bucket to migrate', async () => {
    const backendServers = [server('s1')];
    mockGetExternalServersFromServer.mockResolvedValue(backendServers);
    mockLoadPersistedServers.mockReturnValue([]);

    const result = await resolveHydratedExternalLayers(true, 'token');

    expect(result?.servers).toEqual(backendServers);
    expect(mockSaveExternalServersToServer).not.toHaveBeenCalled();
    expect(mockClearPersistedExternalLayers).not.toHaveBeenCalled();
  });

  it('merges and dedupes the anonymous bucket into the backend servers, persists, then clears the anonymous bucket', async () => {
    const backendServers = [server('s1')];
    const anonServers = [server('s1'), server('s2')];
    mockGetExternalServersFromServer.mockResolvedValue(backendServers);
    mockLoadPersistedServers.mockReturnValue(anonServers);
    mockSaveExternalServersToServer.mockResolvedValue(undefined);

    const result = await resolveHydratedExternalLayers(true, 'token');

    expect(result?.servers).toEqual([server('s1'), server('s2')]);
    expect(mockLoadPersistedServers).toHaveBeenCalledWith();
    expect(mockSaveExternalServersToServer).toHaveBeenCalledWith([server('s1'), server('s2')], 'token');
    expect(mockClearPersistedExternalLayers).toHaveBeenCalledWith();
  });

  it('does not clear the anonymous bucket if the merged save fails', async () => {
    mockGetExternalServersFromServer.mockResolvedValue([server('s1')]);
    mockLoadPersistedServers.mockReturnValue([server('s2')]);
    mockSaveExternalServersToServer.mockRejectedValue(new Error('network error'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await resolveHydratedExternalLayers(true, 'token');

    expect(mockClearPersistedExternalLayers).not.toHaveBeenCalled();
  });

  it('falls back to the session bucket when the backend call fails', async () => {
    mockGetExternalServersFromServer.mockRejectedValue(new Error('network error'));
    const fallback = { ...externalLayersSlice.getInitialState(), servers: [server('s1')] };
    mockLoadPersistedExternalLayers.mockReturnValue(fallback);
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await resolveHydratedExternalLayers(true, 'token');

    expect(result).toBe(fallback);
    expect(mockSaveExternalServersToServer).not.toHaveBeenCalled();
  });

  it('uses the backend servers for a logged-in user without restoring last-active fields from the session bucket', async () => {
    mockGetExternalServersFromServer.mockResolvedValue([server('s1')]);
    mockLoadPersistedServers.mockReturnValue([]);

    const result = await resolveHydratedExternalLayers(true, 'token');

    // Logged-in servers come from the backend only; the anonymous session bucket is not merged in.
    expect(result?.servers).toEqual([server('s1')]);
    expect(result?.lastActiveServerId).toBeNull();
  });
});
