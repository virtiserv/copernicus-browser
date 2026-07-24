import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  ProviderImageTypes,
  SensorModesProperties,
  ProcessorModesProperties,
} from '../../Tools/RapidResponseDesk/rapidResponseProperties';

// TODO: replace with dedicated Provider/Mission/filter interfaces once the RapidResponseDesk
// provider/mission and filter shapes are typed; out of scope for this single-slice extraction.
export interface ImageQualityAndProviderSectionState {
  imageType: string;
  imageResolution: [number, number];
  cloudCoverage: number;
  selectedOpticalProvidersAndMissions: Record<string, unknown>[];
  selectedRadarProvidersAndMissions: Record<string, unknown>[];
  selectedAtmosProvidersAndMissions: Record<string, unknown>[];
  radarPolarizationFilterArray: Record<string, unknown>[];
  radarInstrumentFilterArray: Record<string, unknown>[];
  radarOrbitDirectionArray: Record<string, unknown>[];
  radarSensorMode: string;
  radarProcessorMode: string;
}

const initialState: ImageQualityAndProviderSectionState = {
  imageType: ProviderImageTypes.optical,
  imageResolution: [0, 20],
  cloudCoverage: 0.3,
  selectedOpticalProvidersAndMissions: [],
  selectedRadarProvidersAndMissions: [],
  selectedAtmosProvidersAndMissions: [],
  radarPolarizationFilterArray: [],
  radarInstrumentFilterArray: [],
  radarOrbitDirectionArray: [],
  radarSensorMode: SensorModesProperties[0].value,
  radarProcessorMode: ProcessorModesProperties[0].value,
};

export const imageQualityAndProviderSectionSlice = createSlice({
  name: 'imageQualityAndProviderSection',
  initialState,
  reducers: {
    setImageType: (state, action: PayloadAction<string>) => {
      state.imageType = action.payload;
    },

    setImageResolution: (state, action: PayloadAction<[number, number]>) => {
      state.imageResolution = action.payload;
    },

    setCloudCoverage: (state, action: PayloadAction<number>) => {
      state.cloudCoverage = action.payload;
    },

    setSelectedOpticalProvidersAndMissions: (state, action: PayloadAction<Record<string, unknown>[]>) => {
      state.selectedOpticalProvidersAndMissions = action.payload;
    },

    resetOpticalSection: (state) => {
      state.selectedOpticalProvidersAndMissions = [];
      state.cloudCoverage = 0.3;
    },

    setSelectedRadarProvidersAndMissions: (state, action: PayloadAction<Record<string, unknown>[]>) => {
      state.selectedRadarProvidersAndMissions = action.payload;
    },

    resetRadarSection: (state) => {
      state.selectedRadarProvidersAndMissions = [];
      state.radarPolarizationFilterArray = [];
      state.radarInstrumentFilterArray = [];
      state.radarOrbitDirectionArray = [];
    },

    setRadarPolarizationFilterArray: (state, action: PayloadAction<Record<string, unknown>[]>) => {
      state.radarPolarizationFilterArray = action.payload;
    },

    setRadarInstrumentFilterArray: (state, action: PayloadAction<Record<string, unknown>[]>) => {
      state.radarInstrumentFilterArray = action.payload;
    },

    setOrbitDirectionArray: (state, action: PayloadAction<Record<string, unknown>[]>) => {
      state.radarOrbitDirectionArray = action.payload;
    },

    setRadarSensorMode: (state, action: PayloadAction<string>) => {
      state.radarSensorMode = action.payload;
    },

    setRadarProcessorMode: (state, action: PayloadAction<string>) => {
      state.radarProcessorMode = action.payload;
    },

    setSelectedAtmosProvidersAndMissions: (state, action: PayloadAction<Record<string, unknown>[]>) => {
      state.selectedAtmosProvidersAndMissions = action.payload;
    },

    resetAtmosSection: (state) => {
      state.selectedAtmosProvidersAndMissions = [];
    },

    resetProvidersAndMissions: (state) => {
      state.selectedOpticalProvidersAndMissions = [];
      state.selectedRadarProvidersAndMissions = [];
      state.selectedAtmosProvidersAndMissions = [];
    },
  },
});
