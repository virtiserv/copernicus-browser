import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Timespan {
  id: number;
  from: string | null;
  to: string | null;
  [key: string]: unknown;
}

export interface OverlappedRange {
  selectedTimeRangeId: number;
  overlappedRangeId: number;
}

export interface AreaAndTimeSectionState {
  timespanArray: Timespan[];
  overlappedRanges: OverlappedRange[];
  isTaskingEnabled: boolean;
  isArchiveEnabled: boolean;
}

const initialState: AreaAndTimeSectionState = {
  timespanArray: [],
  overlappedRanges: [],
  isTaskingEnabled: false,
  isArchiveEnabled: true,
};

export const areaAndTimeSectionSlice = createSlice({
  name: 'areaAndTimeSection',
  initialState,
  reducers: {
    setTimespanArray: (state, action: PayloadAction<Timespan[]>) => {
      state.timespanArray = action.payload;
    },

    setRangesOverlapped: (state, action: PayloadAction<OverlappedRange[]>) => {
      state.overlappedRanges = action.payload;
    },

    setIsTaskingEnabled: (state, action: PayloadAction<boolean>) => {
      state.isTaskingEnabled = action.payload;
    },

    setIsArchiveEnabled: (state, action: PayloadAction<boolean>) => {
      state.isArchiveEnabled = action.payload;
    },
  },
});
