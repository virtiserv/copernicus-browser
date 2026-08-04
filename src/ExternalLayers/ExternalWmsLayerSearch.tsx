import React from 'react';
import { t } from 'ttag';

interface Props {
  filter: string;
  onFilterChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
}

const ExternalWmsLayerSearch = ({ filter, onFilterChange, filteredCount, totalCount }: Props) => (
  <div className="external-wms-layer-search">
    <input
      type="text"
      value={filter}
      onChange={(e) => onFilterChange(e.target.value)}
      placeholder={t`Search layers…`}
      className="external-wms-layer-search-input"
    />
    <div className="external-wms-layer-count">
      {filter ? t`${filteredCount} of ${totalCount} layers` : t`${totalCount} layers`}
    </div>
  </div>
);

export default ExternalWmsLayerSearch;
