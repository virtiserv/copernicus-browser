import React from 'react';
import Select, { GroupBase, Props as SelectProps } from 'react-select';

import { customSelectStyle } from '../CustomSelectInput/CustomSelectStyle';
import { CustomDropdownIndicator } from '../CustomSelectInput/CustomDropdownIndicator';
import { CustomOption } from '../CustomOption/CustomOption';

type SearchableSelectProps<Option, IsMulti extends boolean = false> = Omit<
  SelectProps<Option, IsMulti, GroupBase<Option>>,
  'styles' | 'components'
>;

export const SearchableSelect = <Option, IsMulti extends boolean = false>({
  options,
  value,
  onChange,
  isMulti = false as IsMulti,
  menuPlacement = 'auto',
  ...rest
}: SearchableSelectProps<Option, IsMulti>) => (
  <Select
    value={value}
    options={options}
    onChange={onChange}
    isMulti={isMulti}
    menuPlacement={menuPlacement}
    styles={customSelectStyle}
    components={{ DropdownIndicator: CustomDropdownIndicator, Option: CustomOption }}
    {...rest}
  />
);
