import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ProductDownloadState {
  progress: Partial<Record<string, number | null>>;
  cancelTokens: Record<string, AbortController>;
}

const initialState: ProductDownloadState = {
  progress: {},
  cancelTokens: {},
};

export const productDownloadSlice = createSlice({
  name: 'productDownload',
  initialState,
  reducers: {
    setProgress: (state, action: PayloadAction<{ productId: string; value: number | null }>) => {
      const { productId, value } = action.payload;
      state.progress[productId] = value;
    },
    setCancelToken: (state, action: PayloadAction<{ productId: string; cancelToken: AbortController }>) => {
      const { productId, cancelToken } = action.payload;
      state.cancelTokens[productId] = cancelToken;
    },
    reset: () => initialState,
  },
});
