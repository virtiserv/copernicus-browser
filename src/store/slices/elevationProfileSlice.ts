import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ElevationProfileState {
  highlightedPoint: GeoJSON.Feature<GeoJSON.Point> | null;
}

interface SetHighlightedPointPayload {
  geometry: GeoJSON.Feature<GeoJSON.Point>;
}

const initialState: ElevationProfileState = {
  highlightedPoint: null,
};

export const elevationProfileSlice = createSlice({
  name: 'elevationProfile',
  initialState,
  reducers: {
    setHighlightedPoint: (state, action: PayloadAction<SetHighlightedPointPayload>) => {
      state.highlightedPoint = action.payload.geometry;
    },
    reset: (state) => {
      state.highlightedPoint = initialState.highlightedPoint;
    },
  },
});
