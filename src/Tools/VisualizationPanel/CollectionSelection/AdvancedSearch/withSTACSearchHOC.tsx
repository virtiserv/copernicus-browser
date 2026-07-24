import React from 'react';
import { useSTACSearch } from '../../../../hooks/useSTACSearch';

export const withSTACSearchHOC = (WrappedComponent: React.ComponentType<Record<string, unknown>>) => {
  return (props: Record<string, unknown>) => {
    const [
      { searchInProgress, searchError, stacSearchResult },
      stacSearch,
      setSTACAuthToken,
      hydrateSTACSearch,
    ] = useSTACSearch();

    return (
      <WrappedComponent
        stacSearchInProgress={searchInProgress}
        stacSearchError={searchError}
        stacSearchResult={stacSearchResult}
        stacSearch={stacSearch}
        setSTACAuthToken={setSTACAuthToken}
        hydrateSTACSearch={hydrateSTACSearch}
        {...props}
      />
    );
  };
};
