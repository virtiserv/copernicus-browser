import { themesSlice } from './store';

const getInitialState = () => themesSlice.reducer(undefined, { type: '@@INIT' });

describe('themesSlice', () => {
  describe('initial state', () => {
    it('has dataSourcesReadyVersion set to 0 and dataSourcesLoading set to false', () => {
      const state = getInitialState();

      expect(state.dataSourcesReadyVersion).toBe(0);
      expect(state.dataSourcesLoading).toBe(false);
    });
  });

  describe('bumpDataSourcesReadyVersion', () => {
    it('increments dataSourcesReadyVersion by 1 on each call', () => {
      const initialState = { ...getInitialState(), dataSourcesReadyVersion: 0 };

      const afterFirstBump = themesSlice.reducer(
        initialState,
        themesSlice.actions.bumpDataSourcesReadyVersion(),
      );
      expect(afterFirstBump.dataSourcesReadyVersion).toBe(1);

      const afterSecondBump = themesSlice.reducer(
        afterFirstBump,
        themesSlice.actions.bumpDataSourcesReadyVersion(),
      );
      expect(afterSecondBump.dataSourcesReadyVersion).toBe(2);
    });
  });

  describe('setDataSourcesLoading', () => {
    it('sets dataSourcesLoading to true', () => {
      const initialState = { ...getInitialState(), dataSourcesLoading: false };

      const state = themesSlice.reducer(initialState, themesSlice.actions.setDataSourcesLoading(true));

      expect(state.dataSourcesLoading).toBe(true);
    });

    it('sets dataSourcesLoading to false', () => {
      const initialState = { ...getInitialState(), dataSourcesLoading: true };

      const state = themesSlice.reducer(initialState, themesSlice.actions.setDataSourcesLoading(false));

      expect(state.dataSourcesLoading).toBe(false);
    });
  });

  describe('setSelectedThemeId', () => {
    it('resets dataSourcesReadyVersion to 0 and dataSourcesLoading to false', () => {
      const initialState = {
        ...getInitialState(),
        dataSourcesReadyVersion: 5,
        dataSourcesLoading: true,
      };

      const state = themesSlice.reducer(
        initialState,
        themesSlice.actions.setSelectedThemeId({
          selectedThemeId: 'some-theme',
          selectedThemesListId: 'mode',
        }),
      );

      expect(state.dataSourcesReadyVersion).toBe(0);
      expect(state.dataSourcesLoading).toBe(false);
    });
  });

  describe('reset', () => {
    it('resets dataSourcesReadyVersion to 0 and dataSourcesLoading to false', () => {
      const initialState = {
        ...getInitialState(),
        dataSourcesReadyVersion: 5,
        dataSourcesLoading: true,
      };

      const state = themesSlice.reducer(initialState, themesSlice.actions.reset());

      expect(state.dataSourcesReadyVersion).toBe(0);
      expect(state.dataSourcesLoading).toBe(false);
    });
  });

  describe('setSelectedThemeIdAndModeId', () => {
    it('resets dataSourcesReadyVersion and dataSourcesLoading when the theme/mode actually changes', () => {
      const initialState = {
        ...getInitialState(),
        selectedThemeId: 'theme-a',
        selectedModeId: 'default',
        dataSourcesReadyVersion: 5,
        dataSourcesLoading: true,
      };

      const state = themesSlice.reducer(
        initialState,
        themesSlice.actions.setSelectedThemeIdAndModeId({
          selectedThemeId: 'theme-b',
          selectedModeId: 'default',
          selectedThemesListId: 'mode',
        }),
      );

      expect(state.dataSourcesInitialized).toBe(false);
      expect(state.dataSourcesReadyVersion).toBe(0);
      expect(state.dataSourcesLoading).toBe(false);
    });

    it('leaves dataSourcesReadyVersion and dataSourcesLoading untouched on a no-op switch to the same theme/mode', () => {
      const initialState = {
        ...getInitialState(),
        selectedThemeId: 'theme-a',
        selectedModeId: 'default',
        dataSourcesReadyVersion: 5,
        dataSourcesLoading: true,
      };

      const state = themesSlice.reducer(
        initialState,
        themesSlice.actions.setSelectedThemeIdAndModeId({
          selectedThemeId: 'theme-a',
          selectedModeId: 'default',
          selectedThemesListId: 'mode',
        }),
      );

      expect(state.dataSourcesInitialized).toBe(true);
      expect(state.dataSourcesReadyVersion).toBe(5);
      expect(state.dataSourcesLoading).toBe(true);
    });
  });
});
