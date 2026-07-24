import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

import { visualizationSlice } from '../store';
import {
  getDataSourceHandler,
  isDataSourceReadyForDataset,
} from '../Tools/SearchPanel/dataSourceHandlers/dataSourceHandlers';

function VisualizationUrlProvider({ children }) {
  const dispatch = useDispatch();
  const dataSourcesInitialized = useSelector((state) => state.themes.dataSourcesInitialized);
  // Not read directly; forces this effect to re-run once a data source handler's `datasets`
  // array (mutated in place) resolves a new dataset, since isDataSourceReadyForDataset isn't reactive on its own.
  const dataSourcesReadyVersion = useSelector((state) => state.themes.dataSourcesReadyVersion);
  const datasetId = useSelector((state) => state.visualization.datasetId);
  const currentVisualizationUrl = useSelector((state) => state.visualization.visualizationUrl);
  const layerId = useSelector((state) => state.visualization.layerId);
  const customSelected = useSelector((state) => state.visualization.customSelected);
  const datasetReady = dataSourcesInitialized || isDataSourceReadyForDataset(datasetId);

  useEffect(() => {
    if (datasetReady && datasetId) {
      const datasourceHandler = getDataSourceHandler(datasetId);
      if (!datasourceHandler) {
        return;
      }
      const urls = datasourceHandler.getUrlsForDataset(datasetId);
      if (urls.includes(currentVisualizationUrl)) {
        return;
      }
      const visualizationUrl = urls.length > 0 ? urls[0] : null;
      if (visualizationUrl !== currentVisualizationUrl) {
        // Set both visualizationUrl and visibleOnMap when providing a URL
        const shouldBeVisible = !!(layerId || customSelected) && !!datasetId && !!visualizationUrl;
        dispatch(
          visualizationSlice.actions.setVisualizationParams({
            visualizationUrl: visualizationUrl,
            visibleOnMap: shouldBeVisible,
          }),
        );
      }
    }
  }, [
    datasetId,
    datasetReady,
    dataSourcesReadyVersion,
    currentVisualizationUrl,
    layerId,
    customSelected,
    dispatch,
  ]);
  return children;
}

export default VisualizationUrlProvider;
