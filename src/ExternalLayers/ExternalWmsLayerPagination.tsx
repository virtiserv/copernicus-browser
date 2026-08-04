import React from 'react';
import { t } from 'ttag';
import Select from 'react-select';

import { customSelectStyle } from '../components/CustomSelectInput/CustomSelectStyle';
import { CustomDropdownIndicator } from '../components/CustomSelectInput/CustomDropdownIndicator';

interface Props {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  pageSizeOptions: number[];
  onPageSizeChange: (size: number) => void;
}

const ExternalWmsLayerPagination = ({
  page,
  totalPages,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: Props) => (
  // Always shown (even with a single page) so the layout doesn't jump when switching between
  // a paginated service and one with fewer layers. Prev/next disable themselves on a single page.
  <div className="external-wms-layer-pagination">
    <div className="pagination-controls">
      <button
        className="pagination-btn"
        aria-label={t`Previous page`}
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
      >
        <i className="fas fa-chevron-left" />
      </button>
      <span className="pagination-info">
        {page + 1} / {totalPages}
      </span>
      <button
        className="pagination-btn"
        aria-label={t`Next page`}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
      >
        <i className="fas fa-chevron-right" />
      </button>
    </div>
    <Select
      value={{ value: pageSize, label: `${pageSize} ${t`per page`}` }}
      options={pageSizeOptions.map((size) => ({ value: size, label: `${size} ${t`per page`}` }))}
      onChange={(opt) => opt && onPageSizeChange(opt.value)}
      styles={customSelectStyle}
      menuPosition="fixed"
      menuShouldBlockScroll={true}
      menuPlacement="auto"
      isSearchable={false}
      className="wms-per-page-select-dropdown"
      classNamePrefix="wms-per-page-select"
      components={{ DropdownIndicator: CustomDropdownIndicator }}
    />
  </div>
);

export default ExternalWmsLayerPagination;
