import React from 'react';
import { useAppSelector } from '../../hooks';
import { ClmsFeatureInfo } from './ClmsFeatureInfo';
import { ExternalWmsFeatureInfo, ExternalWmsGFI } from './ExternalWmsFeatureInfo';

type FeatureInfoParams =
  | { datasetId: string; lat: number; lng: number }
  | { externalWms: ExternalWmsGFI; lat: number; lng: number };

// Modal entry point: picks the CLMS or external-WMS feature info logic based on modal params.
// Both render the shared FeatureInfoView.
const FeatureInfo = () => {
  const params = useAppSelector((state) => state.modal.params as FeatureInfoParams | null);
  if (!params) {
    return null;
  }
  if ('externalWms' in params) {
    return <ExternalWmsFeatureInfo externalWms={params.externalWms} lat={params.lat} lng={params.lng} />;
  }
  return <ClmsFeatureInfo datasetId={params.datasetId} lat={params.lat} lng={params.lng} />;
};

export default FeatureInfo;
