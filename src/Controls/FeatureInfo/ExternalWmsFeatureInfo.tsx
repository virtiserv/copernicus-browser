import React from 'react';
import { t } from 'ttag';
import { modalSlice } from '../../store';
import { useAppDispatch } from '../../hooks';
import { fetchExternalWmsGetFeatureInfo } from './FeatureInfo.utils';
import { useFeatureInfoRequest } from './useFeatureInfoRequest';
import { FeatureInfoView } from './FeatureInfoView';

// GFI = WMS GetFeatureInfo: the params needed to query feature attributes at a clicked map pixel
// of an external WMS layer (turned into a GetFeatureInfo request by buildExternalGetFeatureInfoUrl).
export type ExternalWmsGFI = {
  serverUrl: string;
  layerName: string;
  layerTitle?: string;
  infoFormat: string;
  mapBounds?: { south: number; west: number; north: number; east: number };
  width?: number;
  height?: number;
};

type Props = { externalWms: ExternalWmsGFI; lat: number; lng: number };

// Feature info for external WMS layers — fetch + raw column labels/values (server keys are
// arbitrary, so we don't apply any curated label map). View uses its default raw formatting.
export const ExternalWmsFeatureInfo = ({ externalWms, lat, lng }: Props) => {
  const dispatch = useAppDispatch();
  const { loading, error, result } = useFeatureInfoRequest(
    () =>
      fetchExternalWmsGetFeatureInfo({
        serverUrl: externalWms.serverUrl,
        layerName: externalWms.layerName,
        infoFormat: externalWms.infoFormat,
        lat,
        lng,
        mapBounds: externalWms.mapBounds,
        width: externalWms.width,
        height: externalWms.height,
      }),
    [externalWms, lat, lng],
  );

  return (
    <FeatureInfoView
      title={externalWms.layerTitle || t`Feature info`}
      loading={loading}
      error={error}
      result={result}
      onClose={() => dispatch(modalSlice.actions.removeModal())}
      width={700}
      height={520}
    />
  );
};
