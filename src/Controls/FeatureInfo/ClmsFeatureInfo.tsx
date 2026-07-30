import React from 'react';
import { t } from 'ttag';
import { modalSlice } from '../../store';
import { useAppDispatch } from '../../hooks';
import { getDatasetLabel } from '../../Tools/SearchPanel/dataSourceHandlers/dataSourceHandlers';
import { fetchWmsGetFeatureInfo } from './FeatureInfo.utils';
import { useFeatureInfoRequest } from './useFeatureInfoRequest';
import { FeatureInfoView } from './FeatureInfoView';

const CLMS_FIELD_LABELS = (): Record<string, string> => ({
  class_2021: t`Class 2021`,
  class_2018: t`Class 2018`,
  code_2021: t`Code 2021`,
  code_2018: t`Code 2018`,
  country: t`Country`,
  fua_name: t`Urban area`,
  fua_code: t`FUA code`,
  STL: t`Street tree layer`,
  identifier: t`Identifier`,
  area: t`Area (m²)`,
  perimeter: t`Perimeter (m)`,
  prod_date: t`Production date`,
  comment: t`Comment`,
});

const formatClmsValue = (key: string, value: string | number | null | undefined): string => {
  if (value === '' || value === null || value === undefined) {
    return '—';
  }
  if (key === 'area' || key === 'perimeter') {
    return Math.round(Number(value)).toLocaleString();
  }
  return String(value);
};

type Props = { datasetId: string; lat: number; lng: number };

// Feature info for CLMS vector datasets (SH backend) — fetch + CLMS-specific labels/formatting.
export const ClmsFeatureInfo = ({ datasetId, lat, lng }: Props) => {
  const dispatch = useAppDispatch();
  const fieldLabels = CLMS_FIELD_LABELS();
  const { loading, error, result } = useFeatureInfoRequest(
    () =>
      fetchWmsGetFeatureInfo({ datasetId, lat, lng }).then((attributes) =>
        attributes ? { kind: 'attributes' as const, attributes } : null,
      ),
    [datasetId, lat, lng],
  );

  return (
    <FeatureInfoView
      title={getDatasetLabel(datasetId) || t`Feature info`}
      loading={loading}
      error={error}
      result={result}
      onClose={() => dispatch(modalSlice.actions.removeModal())}
      getLabel={(key) => fieldLabels[key] || key}
      getValue={formatClmsValue}
    />
  );
};
