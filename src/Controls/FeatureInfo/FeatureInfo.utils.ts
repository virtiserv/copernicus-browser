import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { getDataSourceHandler } from '../../Tools/SearchPanel/dataSourceHandlers/dataSourceHandlers';
import { buildExternalGetFeatureInfoUrl } from '../../ExternalLayers/externalLayers.utils';

export const GFI_IMAGE_SIZE = 512;

export type FeatureAttributes = Record<string, string | number | null | undefined>;

// Result of an external WMS GetFeatureInfo: a parsed attribute table, raw HTML, or plain text.
export type ExternalFeatureInfoResult =
  | { kind: 'attributes'; attributes: FeatureAttributes }
  | { kind: 'html'; html: string }
  | { kind: 'text'; text: string }
  | null;

export async function fetchWmsGetFeatureInfo({
  datasetId,
  lat,
  lng,
}: {
  datasetId: string;
  lat: number;
  lng: number;
}): Promise<FeatureAttributes | null> {
  const dsh = getDataSourceHandler(datasetId);
  if (!dsh || typeof dsh.buildGetFeatureInfoUrl !== 'function') {
    return null;
  }
  const url = dsh.buildGetFeatureInfoUrl(datasetId, lat, lng);
  const response = await axios.get<string>(url);
  return parseGmlResponse(response.data);
}

export function parseGmlResponse(gmlText: string): FeatureAttributes | null {
  const parser = new XMLParser({ parseTagValue: false });
  const parsed = parser.parse(gmlText);
  const msGML = parsed?.msGMLOutput;
  if (!msGML) {
    return null;
  }
  const layerKey = Object.keys(msGML).find((k: string) => k.endsWith('_layer'));
  if (!layerKey) {
    return null;
  }
  const layerData = msGML[layerKey];
  const featureKey = Object.keys(layerData).find((k: string) => k.endsWith('_feature'));
  if (!featureKey) {
    return null;
  }
  // XMLParser returns an array when multiple features share the same key; take the first
  const rawFeature = layerData[featureKey];
  const feature = Array.isArray(rawFeature) ? rawFeature[0] : rawFeature;
  if (!feature) {
    return null;
  }
  const { 'gml:boundedBy': _boundedBy, 'gml:name': _name, ...attributes } = feature;
  return attributes as FeatureAttributes;
}

// Extract the first feature's properties from a GeoJSON GetFeatureInfo response.
function parseJsonFeatureInfo(data: string): FeatureAttributes | null {
  try {
    const json = typeof data === 'string' ? JSON.parse(data) : data;
    const feature = json?.features?.[0];
    const props = feature?.properties;
    if (props && typeof props === 'object' && Object.keys(props).length > 0) {
      return props as FeatureAttributes;
    }
    return null;
  } catch {
    return null;
  }
}

// True when HTML has no visible text content (server returned an empty "no feature" page).
function isEmptyHtml(html: string): boolean {
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length === 0
  );
}

// Fetch and parse GetFeatureInfo for an external WMS layer at a clicked point.
export async function fetchExternalWmsGetFeatureInfo({
  serverUrl,
  layerName,
  infoFormat,
  lat,
  lng,
  mapBounds,
  width,
  height,
}: {
  serverUrl: string;
  layerName: string;
  infoFormat: string;
  lat: number;
  lng: number;
  mapBounds?: { south: number; west: number; north: number; east: number };
  width?: number;
  height?: number;
}): Promise<ExternalFeatureInfoResult> {
  const url = buildExternalGetFeatureInfoUrl({
    serverUrl,
    layerName,
    infoFormat,
    lat,
    lng,
    mapBounds,
    width,
    height,
  });
  // 20s abort so a slow/hanging external WMS server doesn't leave the feature-info spinner running
  // forever (matches the AbortController timeout used for GetCapabilities/GetMap).
  const response = await axios.get<string>(url, {
    responseType: 'text',
    signal: AbortSignal.timeout(20000),
  });
  const data = response.data;
  const fmt = (infoFormat || '').toLowerCase();

  if (fmt.includes('json')) {
    const attributes = parseJsonFeatureInfo(data);
    return attributes ? { kind: 'attributes', attributes } : null;
  }
  if (fmt.includes('html')) {
    const html = (data || '').trim();
    // Show the server's HTML as-is (robust across servers); the modal injects app styling.
    return html && !isEmptyHtml(html) ? { kind: 'html', html } : null;
  }
  if (fmt.includes('xml') || fmt.includes('gml')) {
    const attributes = parseGmlResponse(data);
    return attributes ? { kind: 'attributes', attributes } : null;
  }
  // text/plain (and anything else): show the raw text when it carries content.
  const text = (data || '').trim();
  return text ? { kind: 'text', text } : null;
}
