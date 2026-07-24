import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AdvancedSectionState {
  aoiCoverage: number;
  azimuth: [number, number];
  sunAzimuth: [number, number];
  sunElevation: [number, number];
  incidenceAngle: [number, number];
}

const initialState: AdvancedSectionState = {
  aoiCoverage: 1,
  azimuth: [0, 360],
  sunAzimuth: [0, 360],
  sunElevation: [0, 90],
  incidenceAngle: [0, 90],
};

export const advancedSectionSlice = createSlice({
  name: 'advancedSection',
  initialState,
  reducers: {
    setAoiCoverage: (state, action: PayloadAction<number>) => {
      state.aoiCoverage = action.payload;
    },
    setAzimuth: (state, action: PayloadAction<[number, number]>) => {
      state.azimuth = action.payload;
    },
    setSunAzimuth: (state, action: PayloadAction<[number, number]>) => {
      state.sunAzimuth = action.payload;
    },
    setSunElevation: (state, action: PayloadAction<[number, number]>) => {
      state.sunElevation = action.payload;
    },
    setIncidenceAngle: (state, action: PayloadAction<[number, number]>) => {
      state.incidenceAngle = action.payload;
    },
  },
});
