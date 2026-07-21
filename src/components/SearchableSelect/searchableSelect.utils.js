const wordsOf = (text) =>
  (text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export const defaultMultiTermFilterOption = (option, inputValue) => {
  const terms = inputValue.toLowerCase().split(/\s+/).filter(Boolean);

  if (!terms.length) {
    return true;
  }

  const labelWords = wordsOf(option.label);
  const value = String(option.value).toLowerCase();

  return terms.every((term) => term === value || labelWords.some((word) => word.startsWith(term)));
};
