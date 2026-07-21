import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ToolsState {
  open: boolean;
}

const initialState: ToolsState = {
  open: true,
};

export const toolsSlice = createSlice({
  name: 'tools',
  initialState,
  reducers: {
    setOpen: (state, action: PayloadAction<boolean>) => {
      state.open = action.payload;
    },
    reset: () => initialState,
  },
});
