import { configureStore, combineReducers, createSlice } from '@reduxjs/toolkit';
import { aoiSlice } from './store/slices/aoiSlice';
import { notificationSlice } from './store/slices/notificationSlice';
import { floatingPanelNotificationSlice } from './store/slices/floatingPanelNotificationSlice';
import { tabsSlice } from './store/slices/tabsSlice';
import { languageSlice } from './store/slices/languageSlice';
import { collapsiblePanelSlice } from './store/slices/collapsiblePanelSlice';
import { mainMapSlice } from './store/slices/mainMapSlice';
import { modalSlice } from './store/slices/modalSlice';
import { authSlice } from './store/slices/authSlice';
import { poiSlice } from './store/slices/poiSlice';
import { loiSlice } from './store/slices/loiSlice';
import { compareLayersSlice } from './store/slices/compareLayersSlice';
import { spectralExplorerSlice } from './store/slices/spectralExplorerSlice';
import { indexSlice } from './store/slices/indexSlice';
import { timelapseSlice } from './store/slices/timelapseSlice';
import { elevationProfileSlice } from './store/slices/elevationProfileSlice';
import { pinsSlice } from './store/slices/pinsSlice';
import { terrainViewerSlice } from './store/slices/terrainViewerSlice';
import { productDownloadSlice } from './store/slices/productDownloadSlice';
import { toolsSlice } from './store/slices/toolsSlice';
import { searchResultsSlice } from './store/slices/searchResultsSlice';
import { clmsSlice } from './store/slices/clmsSlice';
import { workspaceSlice } from './store/slices/workspaceSlice';
import { visualizationSlice } from './store/slices/visualizationSlice';

import {
  MODES,
  MODE_THEMES_LIST,
  USER_INSTANCES_THEMES_LIST,
  URL_THEMES_LIST,
  EDUCATION_MODE,
  DEFAULT_THEME_ID,
  RRD_INSTANCES_THEMES_LIST,
} from './const';
import {
  getResultsSectionFilterDefaultValue,
  ProcessorModesProperties,
  ProviderImageTypes,
  SensorModesProperties,
  ResultsSectionSortProperties,
} from './Tools/RapidResponseDesk/rapidResponseProperties';

export { poiSlice };

export { loiSlice };

export { compareLayersSlice };

export { spectralExplorerSlice };

export { indexSlice };

export { aoiSlice };

export { mainMapSlice };

export { toolsSlice };

export { searchResultsSlice };

export { clmsSlice };

export { workspaceSlice };

export { notificationSlice };

export { floatingPanelNotificationSlice };

export { tabsSlice };

export { languageSlice };

export { collapsiblePanelSlice };

export { modalSlice };

export { authSlice };

export { timelapseSlice };

export { elevationProfileSlice };

export { pinsSlice };

export { terrainViewerSlice };

export { productDownloadSlice };

export { visualizationSlice };

export const themesSlice = createSlice({
  name: 'themes',
  initialState: {
    themesUrl: null,
    themesLists: {
      [MODE_THEMES_LIST]: [],
      [USER_INSTANCES_THEMES_LIST]: [],
      [URL_THEMES_LIST]: [],
      [RRD_INSTANCES_THEMES_LIST]: [],
    },
    selectedThemesListId: null,
    dataSourcesInitialized: false,
    selectedThemeId: undefined,
    selectedModeId: undefined,
    failedThemeParts: [],
    useEvoland: false,
  },
  reducers: {
    setSelectedModeId: (state, action) => {
      state.selectedModeId = action.payload;
    },
    setSelectedModeIdAndDefaultTheme: (state, action) => {
      state.selectedModeId = action.payload;
      const modeThemes = MODES.find((mode) => mode.id === state.selectedModeId).themes;
      state.themesLists[MODE_THEMES_LIST] = modeThemes;

      if (state.selectedModeId === EDUCATION_MODE.id) {
        state.selectedThemeId = null;
        state.selectedThemesListId = MODE_THEMES_LIST;
      } else if (state.themesLists[URL_THEMES_LIST].length > 0) {
        const firstThemeIdInList = state.themesLists[URL_THEMES_LIST][0].id;
        state.selectedThemeId = firstThemeIdInList;
        state.selectedThemesListId = URL_THEMES_LIST;
      } else {
        const firstThemeIdInList = modeThemes[0].id;
        state.selectedThemeId = firstThemeIdInList;
        state.selectedThemesListId = MODE_THEMES_LIST;
      }
    },
    setDataSourcesInitialized: (state, action) => {
      state.dataSourcesInitialized = action.payload;
    },
    setThemesUrl: (state, action) => {
      state.themesUrl = action.payload;
    },
    setModeThemesList: (state, action) => {
      state.themesLists[MODE_THEMES_LIST] = action.payload;
    },
    setUserInstancesThemesList: (state, action) => {
      state.themesLists[USER_INSTANCES_THEMES_LIST] = action.payload;
    },
    setUrlThemesList: (state, action) => {
      state.themesLists[URL_THEMES_LIST] = action.payload;
    },
    setRRDThemesList: (state, action) => {
      state.themesLists[RRD_INSTANCES_THEMES_LIST] = action.payload;
    },
    setSelectedThemeId: (state, action) => {
      // - if selectedThemesList is supplied, check the combination and set both selectedThemesList and selectedThemeId
      // - else, find the theme with themeId and set selectedTheme according to this
      const { selectedThemeId, selectedThemesListId } = action.payload;

      if (selectedThemesListId) {
        state.selectedThemeId = selectedThemeId;
        state.selectedThemesListId = selectedThemesListId;
      } else {
        if (state.themesLists[USER_INSTANCES_THEMES_LIST].find((t) => t.id === selectedThemeId)) {
          state.selectedThemesListId = USER_INSTANCES_THEMES_LIST;
          state.selectedThemeId = selectedThemeId;
        } else {
          const isThemeInUrlThemesList = !!state.themesLists[URL_THEMES_LIST].find(
            (t) => t.id === selectedThemeId,
          );
          const isThemeInModeThemesList = !!state.themesLists[MODE_THEMES_LIST].find(
            (t) => t.id === selectedThemeId,
          );
          const isEducationMode = state.selectedModeId === EDUCATION_MODE.id;

          if (state.themesLists[URL_THEMES_LIST].length && !isEducationMode) {
            if (isThemeInUrlThemesList) {
              state.selectedThemesListId = URL_THEMES_LIST;
              state.selectedThemeId = selectedThemeId;
            } else {
              state.selectedThemesListId = URL_THEMES_LIST;
              state.selectedThemeId = null;
            }
          } else if (isThemeInModeThemesList) {
            state.selectedThemesListId = MODE_THEMES_LIST;
            state.selectedThemeId = selectedThemeId;
          } else {
            state.selectedThemesListId = MODE_THEMES_LIST;
            state.selectedThemeId = null;
          }
        }
      }
      state.failedThemeParts = [];
    },
    setFailedThemeParts: (state, action) => {
      state.failedThemeParts = action.payload;
    },
    setSelectedThemeIdAndModeId: (state, action) => {
      const { selectedThemeId, selectedModeId, selectedThemesListId } = action.payload;
      state.dataSourcesInitialized =
        selectedModeId === state.selectedModeId && selectedThemeId === state.selectedThemeId;
      state.selectedThemeId = selectedThemeId;
      const modeThemes = MODES.find((mode) => mode.id === selectedModeId).themes;
      state.themesLists[MODE_THEMES_LIST] = modeThemes;
      state.selectedModeId = selectedModeId;
      state.selectedThemesListId = selectedThemesListId;
    },
    setCurrentProjectName(state, action) {
      state.currentProjectName = action.payload;
    },
    setUseEvoland: (state, action) => {
      state.useEvoland = action.payload;
    },
    reset: (state) => {
      state.themesUrl = null;
      state.selectedThemesListId = 'mode';
      state.dataSourcesInitialized = true;
      state.selectedThemeId = DEFAULT_THEME_ID;
      state.selectedModeId = 'default';
      state.failedThemeParts = [];
      state.currentProjectName = null;
      state.useEvoland = false;
    },
  },
});

export const areaAndTimeSectionSlice = createSlice({
  name: 'areaAndTimeSection',
  initialState: {
    timespanArray: [],
    overlappedRanges: [],
    isTaskingEnabled: false,
    isArchiveEnabled: true,
  },
  reducers: {
    setTimespanArray: (state, action) => {
      state.timespanArray = action.payload;
    },

    setRangesOverlapped: (state, action) => {
      state.overlappedRanges = action.payload;
    },

    setIsTaskingEnabled: (state, action) => {
      state.isTaskingEnabled = action.payload;
    },

    setIsArchiveEnabled: (state, action) => {
      state.isArchiveEnabled = action.payload;
    },
  },
});

export const imageQualityAndProviderSectionSlice = createSlice({
  name: 'imageQualityAndProviderSection',
  initialState: {
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
  },
  reducers: {
    setImageType: (state, action) => {
      state.imageType = action.payload;
    },

    setImageResolution: (state, action) => {
      state.imageResolution = action.payload;
    },

    setCloudCoverage: (state, action) => {
      state.cloudCoverage = action.payload;
    },

    setSelectedOpticalProvidersAndMissions: (state, action) => {
      state.selectedOpticalProvidersAndMissions = action.payload;
    },

    resetOpticalSection: (state) => {
      state.selectedOpticalProvidersAndMissions = [];
      state.cloudCoverage = 0.3;
    },

    setSelectedRadarProvidersAndMissions: (state, action) => {
      state.selectedRadarProvidersAndMissions = action.payload;
    },

    resetRadarSection: (state) => {
      state.selectedRadarProvidersAndMissions = [];
      state.radarPolarizationFilterArray = [];
      state.radarInstrumentFilterArray = [];
      state.radarOrbitDirectionArray = [];
    },

    setRadarPolarizationFilterArray: (state, action) => {
      state.radarPolarizationFilterArray = action.payload;
    },

    setRadarInstrumentFilterArray: (state, action) => {
      state.radarInstrumentFilterArray = action.payload;
    },

    setOrbitDirectionArray: (state, action) => {
      state.radarOrbitDirectionArray = action.payload;
    },

    setRadarSensorMode: (state, action) => {
      state.radarSensorMode = action.payload;
    },

    setRadarProcessorMode: (state, action) => {
      state.radarProcessorMode = action.payload;
    },

    setSelectedAtmosProvidersAndMissions: (state, action) => {
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

export const advancedSectionSlice = createSlice({
  name: 'advancedSection',
  initialState: {
    aoiCoverage: 1,
    satelliteAzimuth: [0, 360],
    azimuth: [0, 360],
    sunAzimuth: [0, 360],
    sunElevation: [0, 90],
    productType: [],
    incidenceAngle: [0, 90],
  },
  reducers: {
    setAoiCoverage: (state, action) => {
      state.aoiCoverage = action.payload;
    },
    setSatelliteAzimuth: (state, action) => {
      state.satelliteAzimuth = action.payload;
    },
    setAzimuth: (state, action) => {
      state.azimuth = action.payload;
    },
    setSunAzimuth: (state, action) => {
      state.sunAzimuth = action.payload;
    },
    setSunElevation: (state, action) => {
      state.sunElevation = action.payload;
    },
    setProductType: (state, action) => {
      state.productType = action.payload;
    },
    setIncidenceAngle: (state, action) => {
      state.incidenceAngle = action.payload;
    },
  },
});

export const resultsSectionSlice = createSlice({
  name: 'resultsSection',
  initialState: {
    filtersForSearch: undefined,
    sortState: ResultsSectionSortProperties[0].value,
    filterState: getResultsSectionFilterDefaultValue(),
    results: undefined,
    highlightedResult: undefined,
    cartResults: undefined,
    currentPage: 1,
    quicklookImages: {},
  },
  reducers: {
    setFiltersForSearch: (state, action) => {
      state.filtersForSearch = action.payload;
    },
    setSortState: (state, action) => {
      state.sortState = action.payload;
    },
    setFilterState: (state, action) => {
      state.filterState = action.payload;
    },
    setResults: (state, action) => {
      state.results = action.payload;
    },
    setHighlightedResult: (state, action) => {
      state.highlightedResult = action.payload;
    },
    setCartResults: (state, action) => {
      state.cartResults = action.payload;
    },
    setCurrentPage: (state, action) => {
      state.currentPage = action.payload;
    },
    addQuicklookImage: (state, action) => {
      const { id, url } = action.payload;
      state.quicklookImages[id] = url;
    },
  },
});

export const commercialDataSlice = createSlice({
  name: 'commercialData',
  initialState: {
    searchResults: [],
    displaySearchResults: false,
    location: null,
    highlightedResult: null,
    selectedOrder: null,
  },
  reducers: {
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
      state.displaySearchResults = action.payload.length > 0;
    },
    setLocation: (state, action) => {
      state.location = action.payload;
    },
    setHighlightedResult: (state, action) => {
      state.highlightedResult = action.payload;
    },
    setDisplaySearchResults: (state, action) => {
      state.displaySearchResults = action.payload;
    },
    setSelectedOrder: (state, action) => {
      state.selectedOrder = action.payload;
    },
    reset: (state) => {
      state.highlightedResult = null;
      state.searchResults = [];
      state.location = null;
      state.displaySearchResults = false;
      state.selectedOrder = null;
    },
  },
});

const reducers = combineReducers({
  aoi: aoiSlice.reducer,
  loi: loiSlice.reducer,
  poi: poiSlice.reducer,
  mainMap: mainMapSlice.reducer,
  notification: notificationSlice.reducer,
  floatingPanelNotification: floatingPanelNotificationSlice.reducer,
  auth: authSlice.reducer,
  themes: themesSlice.reducer,
  modal: modalSlice.reducer,
  visualization: visualizationSlice.reducer,
  tabs: tabsSlice.reducer,
  compare: compareLayersSlice.reducer,
  language: languageSlice.reducer,
  pins: pinsSlice.reducer,
  timelapse: timelapseSlice.reducer,
  index: indexSlice.reducer,
  terrainViewer: terrainViewerSlice.reducer,
  commercialData: commercialDataSlice.reducer,
  searchResults: searchResultsSlice.reducer,
  collapsiblePanel: collapsiblePanelSlice.reducer,
  productDownload: productDownloadSlice.reducer,
  spectralExplorer: spectralExplorerSlice.reducer,
  elevationProfile: elevationProfileSlice.reducer,
  areaAndTimeSection: areaAndTimeSectionSlice.reducer,
  imageQualityAndProviderSection: imageQualityAndProviderSectionSlice.reducer,
  advancedSection: advancedSectionSlice.reducer,
  resultsSection: resultsSectionSlice.reducer,
  tools: toolsSlice.reducer,
  clms: clmsSlice.reducer,
  workspace: workspaceSlice.reducer,
});

const store = configureStore({
  reducer: reducers,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
}); // Due to "A non-serializable value was detected in an action" => https://github.com/rt2zz/redux-persist/issues/988
export default store;
