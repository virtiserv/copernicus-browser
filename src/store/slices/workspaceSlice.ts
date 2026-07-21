import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WorkspaceProduct {
  name: string;
  productId: string;
  cloudCover: number | null;
  platformShortName: string;
  platformSerialIdentifier: string;
  startDate: string;
  online: boolean;
  size: number;
  productType: string;
  thumbnailDownloadLink: string | null;
  catalogueName: string;
  status: string;
  id: string;
  user_id: string;
  created: string;
}

interface WorkspaceState {
  savedWorkspaceProducts: WorkspaceProduct[];
}

const initialState: WorkspaceState = {
  savedWorkspaceProducts: [],
};

export const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setSavedWorkspaceProducts: (state, action: PayloadAction<WorkspaceProduct[]>) => {
      state.savedWorkspaceProducts = action.payload;
    },
  },
});
