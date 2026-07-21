import { defaultMultiTermFilterOption } from './searchableSelect.utils';

describe('defaultMultiTermFilterOption', () => {
  const option = { label: 'United Kingdom (UK)', value: 'UK' };

  test('matches on a single term found in the label', () => {
    expect(defaultMultiTermFilterOption(option, 'kingdom')).toBe(true);
  });

  test('matches on a single term found in the value', () => {
    expect(defaultMultiTermFilterOption(option, 'uk')).toBe(true);
  });

  test('matches when all terms are present in the label, regardless of order', () => {
    expect(defaultMultiTermFilterOption(option, 'united kingdom')).toBe(true);
    expect(defaultMultiTermFilterOption(option, 'kingdom united')).toBe(true);
  });

  test('does not match when one of the terms is missing', () => {
    expect(defaultMultiTermFilterOption(option, 'united france')).toBe(false);
  });

  test('is case-insensitive', () => {
    expect(defaultMultiTermFilterOption(option, 'UNITED KINGDOM')).toBe(true);
    expect(defaultMultiTermFilterOption(option, 'Uk')).toBe(true);
  });

  test('matches everything when inputValue is empty or whitespace-only', () => {
    expect(defaultMultiTermFilterOption(option, '')).toBe(true);
    expect(defaultMultiTermFilterOption(option, '   ')).toBe(true);
  });

  test('matches numeric/non-string values via their stringified form', () => {
    const numericOption = { label: 'Cloud cover', value: 42 };
    expect(defaultMultiTermFilterOption(numericOption, '42')).toBe(true);
  });

  test('matches on the exact country/acronym code even when it is a substring of another label', () => {
    const albania = { label: 'Albania (AL)', value: 'AL' };
    const portugal = { label: 'Portugal (PT)', value: 'PT' };

    expect(defaultMultiTermFilterOption(albania, 'al')).toBe(true);
    expect(defaultMultiTermFilterOption(portugal, 'al')).toBe(false);
  });

  test('does not throw when the option label is missing', () => {
    const optionWithoutLabel = { value: 'AL' };

    expect(() => defaultMultiTermFilterOption(optionWithoutLabel, 'al')).not.toThrow();
    expect(defaultMultiTermFilterOption(optionWithoutLabel, 'al')).toBe(true);
    expect(defaultMultiTermFilterOption(optionWithoutLabel, 'albania')).toBe(false);
  });
});
