import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DEFAULT_SELECTED_CONSOLIDATION_PERIOD_INDEX } from '../../Tools/VisualizationPanel/CollectionSelection/CLMSCollectionSelection.utils';

interface ClmsState {
  selected: boolean;
  selectedPath: string | null;
  selectedCollection: string | null;
  selectedConsolidationPeriodIndex: number;
}

const initialState: ClmsState = {
  selected: false,
  selectedPath: null,
  selectedCollection: null,
  selectedConsolidationPeriodIndex: DEFAULT_SELECTED_CONSOLIDATION_PERIOD_INDEX,
};

export const clmsSlice = createSlice({
  name: 'clms',
  initialState,
  reducers: {
    setSelected: (state, action: PayloadAction<boolean>) => {
      state.selected = action.payload;
    },
    setSelectedPath: (state, action: PayloadAction<string | null>) => {
      state.selectedPath = action.payload;
    },
    setSelectedCollection: (state, action: PayloadAction<string | null>) => {
      state.selectedCollection = action.payload;
    },
    setSelectedConsolidationPeriodIndex: (state, action: PayloadAction<number>) => {
      state.selectedConsolidationPeriodIndex = action.payload;
    },
    reset: (state) => {
      state.selected = false;
      state.selectedPath = null;
      state.selectedCollection = null;
      state.selectedConsolidationPeriodIndex = DEFAULT_SELECTED_CONSOLIDATION_PERIOD_INDEX;
    },
  },
});
