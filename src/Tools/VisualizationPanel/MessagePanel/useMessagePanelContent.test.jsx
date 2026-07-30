import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import useMessagePanelContent from './useMessagePanelContent';
import store, { notificationSlice, themesSlice, visualizationSlice } from '../../../store';
import { tabsSlice } from '../../../store/slices/tabsSlice';
import { TABS } from '../../../const';

function TestHarness() {
  const { show, onClose, content } = useMessagePanelContent();
  if (!show) {
    return <div data-testid="hidden" />;
  }
  return (
    <div data-testid="visible">
      {content}
      {onClose && <button onClick={onClose}>close</button>}
    </div>
  );
}

function renderHarness() {
  return render(
    <Provider store={store}>
      <TestHarness />
    </Provider>,
  );
}

function resetState() {
  act(() => {
    store.dispatch(visualizationSlice.actions.reset());
    store.dispatch(visualizationSlice.actions.setError(null));
    store.dispatch(notificationSlice.actions.displayPanelError(null));
    store.dispatch(themesSlice.actions.setFailedThemeParts([]));
    store.dispatch(tabsSlice.actions.setTabIndex(TABS.VISUALIZE_TAB));
  });
}

describe('useMessagePanelContent', () => {
  beforeEach(() => {
    resetState();
  });

  afterEach(() => {
    resetState();
  });

  test('shows nothing when there is no error, panelError, or failedThemeParts', () => {
    renderHarness();
    expect(screen.getByTestId('hidden')).toBeInTheDocument();
  });

  test('shows the visualization error content once visualization.error is set', () => {
    renderHarness();

    act(() => {
      store.dispatch(visualizationSlice.actions.setError('Something went wrong'));
    });

    expect(screen.getByTestId('visible')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('shows panelError message content', () => {
    store.dispatch(notificationSlice.actions.displayPanelError({ message: 'Panel error message' }));
    renderHarness();
    expect(screen.getByText('Panel error message')).toBeInTheDocument();
  });

  test('shows an external link when panelError.link is set', () => {
    store.dispatch(
      notificationSlice.actions.displayPanelError({ message: 'Link error', link: 'https://example.com' }),
    );
    const { container } = renderHarness();
    expect(container.querySelector('.fa-external-link-alt')).toBeInTheDocument();
  });

  test('does not show an external link when panelError.link is not set', () => {
    store.dispatch(notificationSlice.actions.displayPanelError({ message: 'No link error' }));
    const { container } = renderHarness();
    expect(container.querySelector('.fa-external-link-alt')).not.toBeInTheDocument();
  });

  test('shows a logout action when panelError.logout is true', () => {
    store.dispatch(notificationSlice.actions.displayPanelError({ message: 'Logout error', logout: true }));
    renderHarness();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  test('shows failed theme parts as a list', () => {
    store.dispatch(themesSlice.actions.setFailedThemeParts(['part-a', 'part-b']));
    renderHarness();
    expect(screen.getByText('part-a')).toBeInTheDocument();
    expect(screen.getByText('part-b')).toBeInTheDocument();
  });

  test('does not render a close action when panelError.canBeClosed is false', () => {
    store.dispatch(
      notificationSlice.actions.displayPanelError({ message: 'Cannot close', canBeClosed: false }),
    );
    renderHarness();
    expect(screen.queryByText('close')).not.toBeInTheDocument();
  });

  test('closing the panel clears error, panelError and failedThemeParts but leaves resolutionTooLow untouched', () => {
    renderHarness();

    act(() => {
      store.dispatch(visualizationSlice.actions.setError('Some error'));
      store.dispatch(visualizationSlice.actions.setResolutionTooLow(true));
    });

    fireEvent.click(screen.getByText('close'));

    const state = store.getState();
    expect(state.visualization.error).toBeNull();
    expect(state.notification.panelError).toBeNull();
    expect(state.themes.failedThemeParts).toEqual([]);
    expect(state.visualization.resolutionTooLow).toBe(true);
  });

  test('clears the error when selectedTabIndex changes', () => {
    renderHarness();

    act(() => {
      store.dispatch(visualizationSlice.actions.setError('Some error'));
    });
    expect(screen.getByTestId('visible')).toBeInTheDocument();

    act(() => {
      store.dispatch(tabsSlice.actions.setTabIndex(TABS.SEARCH_TAB));
    });

    expect(screen.getByTestId('hidden')).toBeInTheDocument();
  });

  test('clears failedThemeParts once datasetId, layerId and toTime are all set', () => {
    store.dispatch(themesSlice.actions.setFailedThemeParts(['part-a']));
    renderHarness();
    expect(screen.getByTestId('visible')).toBeInTheDocument();

    act(() => {
      store.dispatch(
        visualizationSlice.actions.setVisualizationParams({
          datasetId: 'DATASET',
          layerId: 'LAYER',
          toTime: '2024-01-01T00:00:00.000Z',
        }),
      );
    });

    expect(screen.getByTestId('hidden')).toBeInTheDocument();
  });
});
