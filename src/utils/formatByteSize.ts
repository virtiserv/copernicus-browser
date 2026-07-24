/**
 * Byte-size formatting used by STAC search results (Results.utils.ts). Unlike OData's
 * MB-only formatter (formatFileSize in searchResults.utils.ts), this renders using the
 * most appropriate unit across Bytes/KB/MB/GB/TB, since STAC aggregate asset totals can
 * be much smaller or larger than a single OData product entry.
 *
 * Returns an empty string for a falsy/zero/undefined/null byte value, so callers needing
 * a "does this product have a known size" check should look at the underlying numeric
 * byte value directly rather than string-matching the formatted output.
 */

const BYTE_SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

export const formatByteSizeAuto = (bytes: number | null | undefined): string => {
  if (!bytes || bytes < 0) {
    return '';
  }

  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_SIZE_UNITS.length - 1);

  return `${Math.round((bytes / Math.pow(1024, i)) * 100) / 100} ${BYTE_SIZE_UNITS[i]}`;
};
