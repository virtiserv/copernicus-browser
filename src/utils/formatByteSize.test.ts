import { formatByteSizeAuto } from './formatByteSize';

describe('formatByteSizeAuto', () => {
  test.each([
    [undefined, ''],
    [null, ''],
    [0, ''],
    [-1, ''],
  ])('returns an empty string for falsy/negative input %p', (input, expected) => {
    expect(formatByteSizeAuto(input as number | null | undefined)).toBe(expected);
  });

  test('formats a sub-KB value in Bytes', () => {
    expect(formatByteSizeAuto(512)).toBe('512 Bytes');
  });

  test('formats a KB-range value', () => {
    expect(formatByteSizeAuto(2048)).toBe('2 KB');
  });

  test('formats an MB-range value', () => {
    expect(formatByteSizeAuto(5 * 1024 * 1024)).toBe('5 MB');
  });

  test('formats a GB-range value', () => {
    expect(formatByteSizeAuto(3 * 1024 * 1024 * 1024)).toBe('3 GB');
  });

  test('formats a TB-range value, the largest defined unit', () => {
    expect(formatByteSizeAuto(2 * 1024 * 1024 * 1024 * 1024)).toBe('2 TB');
  });

  test('clamps to TB instead of indexing past the unit table for a 1 PB value', () => {
    // Regression test: Math.floor(Math.log(bytes) / Math.log(1024)) evaluates to 5 at 1024^5
    // bytes, one past the last valid index (4 = TB) into BYTE_SIZE_UNITS, which used to
    // produce the literal string "1 undefined".
    expect(formatByteSizeAuto(Math.pow(1024, 5))).toBe('1024 TB');
  });

  test('clamps to TB for values well beyond 1 PB', () => {
    expect(formatByteSizeAuto(Math.pow(1024, 6))).toBe('1048576 TB');
  });
});
