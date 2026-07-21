import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TABS } from '../../const';

interface TabsState {
  selectedTabIndex: (typeof TABS)[keyof typeof TABS];
  scrollTop: number | null;
}

const initialState: TabsState = {
  selectedTabIndex: TABS.VISUALIZE_TAB,
  scrollTop: null,
};

export const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    setTabIndex: (state, action: PayloadAction<TabsState['selectedTabIndex']>) => {
      state.selectedTabIndex = action.payload;
    },
    setScrollTop: (state, action: PayloadAction<number | null>) => {
      state.scrollTop = action.payload;
    },
  },
});
