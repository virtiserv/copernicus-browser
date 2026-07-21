import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Moment } from 'moment';
import type { RRDFeature } from '../../api/RRD/result.utils';
import type { ODataSearchResultItem, ODataSearchResult } from '../../api/OData/searchResults.utils';

type SearchResultTile = ODataSearchResultItem | RRDFeature;

type SelectedResult = ODataSearchResultItem | (RRDFeature & { previewUrl?: string });

interface CollectionFormState {
  selectedCollections: Record<string, unknown>;
  maxCc: Record<string, number | Record<string, unknown>>;
  selectedFilters: Record<string, Record<string, unknown>>;
}

interface SearchFormData {
  fromMoment: Moment;
  toMoment: Moment;
  collectionForm: CollectionFormState;
  searchCriteria?: string;
}

export interface SearchResultsState {
  displayingSearchResults: boolean;
  searchResult: ODataSearchResult | null;
  selectedTiles: SearchResultTile[] | null;
  highlightedTile: ODataSearchResultItem | null;
  selectedResult: SelectedResult | null;
  resultsAvailable: boolean;
  resultsPanelSelected: boolean;
  searchFormData: SearchFormData | null;
}

const initialState: SearchResultsState = {
  displayingSearchResults: false,
  searchResult: null,
  selectedTiles: null,
  highlightedTile: null,
  selectedResult: null,
  resultsAvailable: false,
  resultsPanelSelected: false,
  searchFormData: null,
};

export const searchResultsSlice = createSlice({
  name: 'searchResults',
  initialState,
  reducers: {
    setDisplayingSearchResults: (state, action: PayloadAction<boolean>) => {
      state.displayingSearchResults = action.payload;
    },
    setSearchResult: (state, action: PayloadAction<ODataSearchResult>) => {
      state.searchResult = action.payload;
      state.resultsAvailable = true;
      state.resultsPanelSelected = true;
    },
    setSearchFormData: (state, action: PayloadAction<SearchFormData>) => {
      state.searchFormData = action.payload;
    },
    setSelectedTiles: (state, action: PayloadAction<SearchResultTile[] | null | undefined>) => {
      state.selectedTiles = action.payload ?? null;
    },
    setHighlightedTile: (state, action: PayloadAction<ODataSearchResultItem | null>) => {
      state.highlightedTile = action.payload;
    },
    setSelectedResult: (state, action: PayloadAction<SelectedResult | null>) => {
      state.selectedResult = action.payload;
    },
    // searchFormData is intentionally preserved: the "back to search" flow in
    // AdvancedSearch.jsx relies on it still being set after reset() to repopulate
    // the form with the last search's parameters, then clears it itself via setSearchFormData(null).
    reset: (state) => {
      state.displayingSearchResults = false;
      state.searchResult = null;
      state.selectedTiles = null;
      state.highlightedTile = null;
      state.selectedResult = null;
      state.resultsAvailable = false;
      state.resultsPanelSelected = false;
    },
  },
});
