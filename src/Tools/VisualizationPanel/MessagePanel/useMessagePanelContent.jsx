import React, { useEffect } from 'react';
import { t } from 'ttag';

import VisualizationErrorPanel from './VisualizationErrorPanel';
import { NotificationPanel } from '../../../junk/NotificationPanel/NotificationPanel';
import ExternalLink from '../../../ExternalLink/ExternalLink';
import store, { notificationSlice, themesSlice, visualizationSlice } from '../../../store';
import { useAppSelector } from '../../../hooks';
import useLoginLogout from '../../../Auth/loginLogout/useLoginLogout';

export default function useMessagePanelContent() {
  const error = useAppSelector((store) => store.visualization.error);
  const panelError = useAppSelector((store) => store.notification.panelError);
  const failedThemeParts = useAppSelector((store) => store.themes.failedThemeParts);
  const selectedTabIndex = useAppSelector((store) => store.tabs.selectedTabIndex);
  const selectedThemeId = useAppSelector((store) => store.themes.selectedThemeId);
  const datasetId = useAppSelector((store) => store.visualization.datasetId);
  const layerId = useAppSelector((store) => store.visualization.layerId);
  const customSelected = useAppSelector((store) => store.visualization.customSelected);
  const toTime = useAppSelector((store) => store.visualization.toTime);

  const { doLogout } = useLoginLogout();

  useEffect(() => {
    store.dispatch(visualizationSlice.actions.setError(null));
  }, [selectedTabIndex, selectedThemeId]);

  useEffect(() => {
    if (datasetId && (layerId || customSelected) && toTime) {
      store.dispatch(themesSlice.actions.setFailedThemeParts([]));
    }
  }, [datasetId, layerId, customSelected, toTime]);

  if (!error && !panelError && failedThemeParts.length < 1) {
    return { show: false, onClose: undefined, content: null };
  }

  const content = (
    <>
      {error && <VisualizationErrorPanel error={error} />}
      {panelError && (
        <NotificationPanel
          type="nothing"
          msg={
            <div className="message-content">
              <span>{panelError.message}</span>
              {panelError.link ? (
                <ExternalLink href={panelError.link}>
                  <i className="fas fa-external-link-alt" />
                </ExternalLink>
              ) : null}
              {panelError.logout && (
                <div className="message-panel-logout" onClick={doLogout} title={t`Logout`}>{t`Logout`}</div>
              )}
            </div>
          }
        />
      )}
      {failedThemeParts.length > 0 && (
        <NotificationPanel
          type="nothing"
          additionalClass="notification-error-themes"
          msg={
            <div>
              {t`Error retrieving additional data!`}
              <div>
                <span>{t`These are theme parts which contain unavailable data sources:`}</span>
                <ul style={{ textAlign: 'left' }}>
                  {failedThemeParts.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          }
        />
      )}
    </>
  );

  function closePanel() {
    store.dispatch(visualizationSlice.actions.setError(null));
    store.dispatch(notificationSlice.actions.displayPanelError(null));
    store.dispatch(themesSlice.actions.setFailedThemeParts([]));
  }

  return {
    show: true,
    onClose: panelError?.canBeClosed === false ? undefined : closePanel,
    content,
  };
}
