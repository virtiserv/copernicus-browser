import type { Geometry } from 'geojson';
import * as wellknown from 'wellknown';

import { AttributeNames, FormatedAttributeNames } from './assets/attributes';

export interface ODataRawAttribute {
  '@odata.type': string;
  Name: string;
  Value: string | number;
  ValueType: 'String' | 'Double' | 'Integer' | 'DateTimeOffset';
}

interface ODataRawProduct {
  Id: string;
  Name: string;
  Footprint?: string;
  ContentDate: { Start: string };
  ContentLength: number;
  OriginDate: string | null;
  PublicationDate: string | null;
  ModificationDate: string | null;
  Online: boolean;
  S3Path: string;
  Attributes: ODataRawAttribute[];
  Assets?: { DownloadLink: string }[];
}

export interface ODataSearchResultItem {
  id: string;
  name: string;
  geometry: Geometry | null | undefined;
  previewUrl: string | undefined;
  sensingTime: string;
  platformShortName: string | undefined;
  instrumentShortName: string | undefined;
  productType: string | undefined;
  size: string;
  originDate: string | null;
  publicationDate: string | null;
  modificationDate: string | null;
  online: boolean;
  S3Path: string;
  attributes: ODataRawAttribute[];
  contentLength: number;
}

export interface ODataSearchResult {
  allResults: ODataSearchResultItem[];
  page: number;
  hasMore: boolean;
  totalCount: number;
  next: (() => void | Promise<void>) | null;
}

// Overlaps with getAttributes (src/api/OData/workspace.jsx) and inline attribute
// `.find` lookups in OData.utils.js/ResultItem.jsx/ProductPreview.jsx — pre-existing
// duplication, not introduced here. Worth consolidating into one shared lookup utility.
const getAttributeValue = (result: ODataRawProduct, attributeName: string): string | number | undefined => {
  const attribute = result.Attributes.find((attr) => attr.Name === attributeName);
  return attribute?.Value;
};

const getPreviewUrl = (result: ODataRawProduct): string | undefined => {
  return result?.Assets?.[0]?.DownloadLink;
};

const formatFileSize = (size: number | null | undefined): string => {
  if (size === null || size === undefined) {
    return '';
  }
  const sizeMb = Math.round(size / (1024 * 1024));
  if (sizeMb < 1) {
    return `< 1MB`;
  }
  return `${sizeMb}MB`;
};

export const formatSearchResults = (
  results: ODataRawProduct[] | null | undefined,
): ODataSearchResultItem[] | null => {
  if (!results) {
    return null;
  }

  const converted = results.map((result) => {
    return {
      id: result.Id,
      name: result.Name,
      geometry: (result.Footprint && wellknown.parse(result.Footprint.replace('geography', ''))) as
        | Geometry
        | undefined,
      previewUrl: getPreviewUrl(result),
      sensingTime: result['ContentDate']['Start'],
      platformShortName: getAttributeValue(result, AttributeNames.platformShortName) as string | undefined,
      instrumentShortName: getAttributeValue(result, AttributeNames.instrumentShortName) as
        | string
        | undefined,
      productType: getAttributeValue(result, AttributeNames.productType) as string | undefined,
      size: formatFileSize(result.ContentLength),
      originDate: result.OriginDate,
      publicationDate: result.PublicationDate,
      modificationDate: result.ModificationDate,
      online: result.Online,
      S3Path: result.S3Path,
      attributes: result.Attributes,
      contentLength: result.ContentLength,
    };
  });
  return converted;
};

export const formatAttributesNames = (attribute: string): string => {
  return FormatedAttributeNames[attribute] ? FormatedAttributeNames[attribute]() : attribute;
};
