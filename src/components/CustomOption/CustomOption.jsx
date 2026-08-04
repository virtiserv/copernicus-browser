import React from 'react';
import { components } from 'react-select';
import { t } from 'ttag';

export const CustomOption = (props) => {
  const { data } = props;

  return (
    <div title={data.label} className={data.type === 'category' ? 'option-category' : undefined}>
      <components.Option {...props}>
        {data.label}
        {data.type === 'category' && <span className="option-category-suffix">{t` (Category)`}</span>}
      </components.Option>
    </div>
  );
};
