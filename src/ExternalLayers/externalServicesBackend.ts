import axios from 'axios';
import { ExternalServer } from '../store/slices/externalLayersSlice';

const externalServicesUrl = (): string => `${import.meta.env.VITE_CDSE_BACKEND}userexternalservers`;

const authHeaders = (accessToken: string) => ({
  responseType: 'json' as const,
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

// accessToken is passed in by the caller rather than read from the store here, so this module has
// no runtime dependency on `store`. It is imported by externalLayersSlice.ts, which store.js loads
// eagerly to build the root reducer — importing `store` here would create a circular dependency
// back through store.js.
export async function getExternalServersFromServer(accessToken: string): Promise<ExternalServer[]> {
  const res = await axios.get(externalServicesUrl(), authHeaders(accessToken));
  if (res.data && !Array.isArray(res.data) && !Array.isArray(res.data.items)) {
    console.warn('Unexpected external servers response shape from backend:', res.data);
  }
  return res.data?.items ?? res.data ?? [];
}

// Full-array PUT replace, same semantics as the pins backend (see Pin.utils.js's
// savePinsToBackend/removePinsFromBackend) — the entire server list is always replaced, never
// patched.
export async function saveExternalServersToServer(
  servers: ExternalServer[],
  accessToken: string,
): Promise<void> {
  await axios.put(externalServicesUrl(), { items: servers }, authHeaders(accessToken));
}

// Dedupes servers by normalized url+type (case-insensitive) so merging the anonymous bucket with
// backend servers on login migration never creates duplicates, including on repeated logins.
// Keeps the first occurrence, so callers should order the array with the preferred copy first.
export function dedupeExternalServers(servers: ExternalServer[]): ExternalServer[] {
  const seen = new Set<string>();
  return servers.filter((server) => {
    const key = `${server.url.trim().toLowerCase()}|${server.type.toLowerCase()}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
