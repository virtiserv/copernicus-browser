import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import CollectionSelection from './CollectionSelection';

let mockCurrentTestStore;
jest.mock('../../../store', () => {
  const actual = jest.requireActual('../../../store');
  return {
    __esModule: true,
    ...actual,
    get default() {
      return mockCurrentTestStore;
    },
  };
});

const mockCollectionGroups = [
  {
    datasource: 'S2',
    title: 'Sentinel-2',
    preselectedDataset: 'S2L2A',
    collections: [
      {
        dataset: 'S2L2A',
        title: 'Collection A',
        datasource: 'S2',
        getDescription: () => '',
      },
    ],
  },
];

jest.mock('./CollectionSelection.utils', () => ({
  createCollectionGroupsFromDataSourceHandlers: jest.fn(() => mockCollectionGroups),
  getSelectedCollectionTitle: jest.fn(() => ''),
  displayLatestDateOnSelect: jest.fn(),
}));

jest.mock('../../SearchPanel/dataSourceHandlers/dataSourceHandlers', () => ({
  getDataSourceHandler: jest.fn(() => undefined),
}));

jest.mock('./CollectionSearch', () => ({
  CollectionSearch: () => <div>CollectionSearch</div>,
  CollectionSearchTools: () => <div>CollectionSearchTools</div>,
}));

function makeStore({ dataSourcesInitialized, dataSourcesReadyVersion, dataSourcesLoading, datasetId }) {
  mockCurrentTestStore = configureStore({
    reducer: {
      themes: (state = { selectedThemeId: 'theme1' }) => state,
      visualization: (state = {}) => state,
      mainMap: (state = {}) => state,
      collapsiblePanel: (state = {}) => state,
      auth: (state = {}) => state,
      clms: (state = {}) => state,
    },
    preloadedState: {
      themes: {
        selectedThemeId: 'theme1',
        dataSourcesInitialized,
        dataSourcesReadyVersion,
        dataSourcesLoading,
      },
      visualization: { datasetId, toTime: undefined, cloudCoverage: 0.3 },
      mainMap: { bounds: undefined, pixelBounds: undefined },
      collapsiblePanel: { collectionPanelExpanded: false },
      auth: { user: {} },
      clms: {},
    },
  });
  return mockCurrentTestStore;
}

function renderComponent(preloadedThemesState) {
  const store = makeStore(preloadedThemesState);
  return { store, ...render(<Provider store={store}><CollectionSelection /></Provider>) };
}

describe('CollectionSelection', () => {
  it('populates the collection title once dataSourcesReadyVersion advances, even before dataSourcesInitialized', () => {
    renderComponent({
      dataSourcesInitialized: false,
      dataSourcesReadyVersion: 1,
      dataSourcesLoading: false,
      datasetId: 'S2L2A',
    });

    expect(screen.getByText('Collection A')).toBeInTheDocument();
  });

  it('does not populate the collection title while neither readiness signal has fired', () => {
    renderComponent({
      dataSourcesInitialized: false,
      dataSourcesReadyVersion: 0,
      dataSourcesLoading: false,
      datasetId: 'S2L2A',
    });

    expect(screen.queryByText('Collection A')).not.toBeInTheDocument();
  });
});
