import { useState, useEffect, useCallback, useRef } from 'react';
import { normalizeResults } from '../Tools/Results/Results.utils';
import { getAvailabilityInfoForStacIds } from './stacAvailability';

export const STAC_SEARCH_ERROR_MESSAGE = {
  NO_PRODUCTS_FOUND: 'No products found',
  API_ERROR: 'STAC API error',
};

const PAGE_SIZE = 50;

const STAC_BASEURL = window.API_ENDPOINT_CONFIG?.STAC_BASEURL;

interface StacSearchError extends Error {
  availabilityMessage?: string;
}

export interface STACSearchResult {
  allResults: unknown[];
  hasMore: boolean;
  totalCount: number;
  next: (() => void) | null;
  nextToken: string | null;
}

interface HydrateSTACSearchParams {
  payload: Record<string, unknown>;
  results: unknown[];
  totalCount: number;
  hasMore: boolean;
  nextToken: string | null;
}

/*
useSTACSearch hook handles STAC API search functionality similar to useODataSearch

It returns an array with 4 elements:
- the first element is an object with
   - searchInProgress - boolean indicating if a search is in progress
   - searchError - error object
   - stacSearchResult: an object with results
- the second element is a function which accepts STAC payload and initiates a search
- the third element is a function to set auth token (if needed)
- the fourth element is a hydrate function which reconstructs stacSearchResult locally from
  cached state (including the cursor token needed to resume pagination) without a network call

usage example:

```
const [{ searchInProgress, searchError, stacSearchResult }, stacSearch, setSTACAuthToken] = useSTACSearch();
...

 <EOBButton loading={searchInProgress} onClick={()=>stacSearch(stacPayload)} text={t`Search`} />...

```
*/
export const useSTACSearch = () => {
  const [payload, setPayload] = useState<Record<string, unknown> | null>(null);
  const [stacSearchResult, setSTACSearchResult] = useState<STACSearchResult | null>(null);
  const [searchInProgress, setSearchInProgress] = useState(false);
  const [searchError, setSearchError] = useState<StacSearchError | null>(null);
  // Use a ref so auth token reads are always synchronous (no state update lag),
  // mirroring the pattern in useODataSearch.
  const authTokenRef = useRef<string | null>(null);

  const setAuthToken = useCallback((token: string) => {
    authTokenRef.current = token;
  }, []);

  const search = useCallback(
    async (
      payload: Record<string, unknown> | null,
      existingResults: unknown[] = [],
      nextToken: string | null = null,
    ) => {
      if (!payload) {
        setSearchInProgress(false);
        setSearchError(null);
        return;
      }

      try {
        setSearchInProgress(true);
        setSearchError(null);

        // Use the cursor token for subsequent pages; omit offset entirely.
        // The token is provided by the API in the `next` link body and ensures
        // consistent cursor-based pagination without duplicates.
        const searchPayload = {
          ...payload,
          limit: PAGE_SIZE,
          ...(nextToken ? { token: nextToken } : {}),
        };

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (authTokenRef.current) {
          headers['Authorization'] = `Bearer ${authTokenRef.current}`;
        }

        const response = await fetch(`${STAC_BASEURL}/v1/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify(searchPayload),
        });

        if (!response.ok) {
          throw new Error(`${STAC_SEARCH_ERROR_MESSAGE.API_ERROR}: ${response.status}`);
        }

        const data = await response.json();

        if (!(data && data.features && data.features.length)) {
          if (existingResults && existingResults.length) {
            const result: STACSearchResult = {
              allResults: existingResults,
              hasMore: false,
              totalCount: existingResults.length,
              next: null,
              nextToken: null,
            };
            setSTACSearchResult(result);
            return;
          }

          const error: StacSearchError = new Error(STAC_SEARCH_ERROR_MESSAGE.NO_PRODUCTS_FOUND);
          if (payload.collections && (payload.collections as unknown[]).length) {
            const availabilityMessage = await getAvailabilityInfoForStacIds(
              payload.collections,
              authTokenRef.current,
            );
            if (availabilityMessage) {
              error.availabilityMessage = availabilityMessage;
            }
          }
          throw error;
        }

        // Normalize STAC results to unified format
        const normalizedResults = normalizeResults(data.features);

        const allResults = [...existingResults, ...normalizedResults];

        // Use the `next` link token for cursor-based pagination.
        // This avoids duplicates that occur with offset-based pagination when
        // the backend doesn't guarantee a stable order across requests.
        const nextLink = data.links?.find((l: { rel?: string }) => l.rel === 'next');
        const nextPageToken = nextLink?.body?.token ?? null;
        const hasMore = !!nextPageToken;

        /*STAC Search result has similar structure to OData
        - allResults: array of products
        - hasMore: boolean indicating if there are more results
        - totalCount: number of all products
        - next: function for fetching next page
        - nextToken: the cursor token for the next page (exposed so callers can persist
          it, e.g. to sessionStorage, and later reconstruct `next` via hydrate() below)
        */
        const result: STACSearchResult = {
          allResults: allResults,
          hasMore: hasMore,
          totalCount: data.numberMatched || allResults.length,
          next: hasMore ? () => search(payload, allResults, nextPageToken) : null,
          nextToken: nextPageToken,
        };
        setSTACSearchResult(result);
      } catch (e) {
        setSearchError(e as StacSearchError);
      } finally {
        setSearchInProgress(false);
      }
    },
    [],
  );

  useEffect(() => {
    search(payload);
  }, [payload, search]);

  /*
  hydrate reconstructs stacSearchResult from cached state without making a network call.
  Use this to restore the next() pagination function on page refresh instead of re-fetching
  the first page. Requires the original search payload and the cursor token for the next
  page (both must have been persisted by the caller alongside the cached results).
  */
  const hydrate = useCallback(
    ({ payload, results, totalCount, hasMore: hasMoreResults, nextToken }: HydrateSTACSearchParams) => {
      setSTACSearchResult({
        allResults: results,
        totalCount,
        hasMore: hasMoreResults,
        next: hasMoreResults && nextToken ? () => search(payload, results, nextToken) : null,
        nextToken: nextToken ?? null,
      });
    },
    [search],
  );

  return [{ searchInProgress, searchError, stacSearchResult }, setPayload, setAuthToken, hydrate] as const;
};
