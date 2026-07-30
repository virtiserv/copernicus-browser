import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { t } from 'ttag';
import Select from 'react-select';
import L from 'leaflet';

import { externalLayersSlice } from '../store';
import { selectExternalLayers } from '../store/slices/externalLayersSlice';
import { useAppSelector } from '../hooks';
import ActionBar from '../components/ActionBar/ActionBar';
import { createLayerActions } from '../Tools/VisualizationPanel/VisualizationLayer/createLayerActions';
import { customSelectStyle } from '../components/CustomSelectInput/CustomSelectStyle';
import { CustomDropdownIndicator } from '../components/CustomSelectInput/CustomDropdownIndicator';
import { buildExternalWmsGetMapUrl } from '../Controls/ImgDownload/WmsDownload.utils';
import { buildWmtsPreviewTileUrl, validateWmsUrl, safeHostname, PreviewBbox } from './externalLayers.utils';
import ExternalLink from '../ExternalLink/ExternalLink';

import './ExternalWmsLayerContainer.scss';

const EMPTY_IMAGE_DATA_URI = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

function buildPreviewUrl(
  server: { url: string; type: string; version?: string },
  layer: { name: string; tileUrl?: string; legendUrl?: string; bbox?: PreviewBbox },
): string {
  if (server.type === 'WMTS' && layer.tileUrl) {
    return buildWmtsPreviewTileUrl(layer.tileUrl, layer.bbox);
  }
  // Aim the GetMap thumbnail at the layer's advertised extent (so regional layers show their
  // data); fall back to the whole world when no usable bbox is advertised.
  const b = layer.bbox;
  const bounds =
    b && b.east > b.west && b.north > b.south
      ? L.latLngBounds([b.south, b.west], [b.north, b.east])
      : L.latLngBounds([-90, -180], [90, 180]);
  return buildExternalWmsGetMapUrl(server.url, layer.name, bounds, 64, 64);
}

interface Props {
  savePin?: () => void;
  toggleLayerActions?: (e: React.MouseEvent) => void;
  layerActionsOpen?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const ExternalWmsLayerContainer = ({ savePin, toggleLayerActions, layerActionsOpen }: Props) => {
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const dispatch = useDispatch();
  const { servers, activeServerId, activeLayerId } = useAppSelector(selectExternalLayers);
  const { zoom, lat, lng, is3D } = useAppSelector((state) => state.mainMap);
  const user = useAppSelector((state) => state.auth.user);

  const server = useMemo(
    () => servers.find((s: { id: string; url: string; type: string }) => s.id === activeServerId),
    [servers, activeServerId],
  );

  useEffect(() => {
    setPage(0);
  }, [filter, activeServerId, pageSize]);

  const matchesFilter = useCallback(
    (layer: { title: string; name: string }, filterValue: string): boolean => {
      const terms = filterValue.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.length) {
        return true;
      }
      const title = layer.title.toLowerCase();
      const name = layer.name.toLowerCase();
      return terms.every((term) => title.includes(term) || name.includes(term));
    },
    [],
  );

  useEffect(() => {
    if (!activeLayerId || !server?.layers?.length) {
      return;
    }
    const allLayers = server.layers ?? [];
    const filteredLayers = filter ? allLayers.filter((l) => matchesFilter(l, filter)) : allLayers;
    const idx = filteredLayers.findIndex((l) => l.id === activeLayerId);
    if (idx >= 0) {
      setPage(Math.floor(idx / pageSize));
    }
  }, [activeLayerId, server, filter, pageSize, matchesFilter]);

  if (!server) {
    return null;
  }

  const layers: {
    id: string;
    name: string;
    title: string;
    abstract?: string;
    timeDimension?: string;
    legendUrl?: string;
    tileUrl?: string;
    bbox?: PreviewBbox;
    metadataUrls?: string[];
    attribution?: string;
  }[] = server.layers ?? [];
  const filtered = filter ? layers.filter((l) => matchesFilter(l, filter)) : layers;

  // At least 1 so an empty filter result shows "1 / 1" instead of a confusing "1 / 0".
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const layerActions = createLayerActions({ zoom, lat, lng, is3D, savePin, user });

  return (
    <div className="layer-selection external-wms-layer-container has-pagination">
      <div className="layer-header">
        <div className="layer-title">{t`Layers`}:</div>
      </div>

      {layers.length > 0 && (
        <div className="external-wms-layer-search">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t`Search layers…`}
            className="external-wms-layer-search-input"
          />
          <div className="external-wms-layer-count">
            {filter ? t`${filtered.length} of ${layers.length} layers` : t`${layers.length} layers`}
          </div>
        </div>
      )}

      <div className="external-wms-layer-list" role="listbox">
        {paginated.map((layer) => {
          const isActive = layer.id === activeLayerId;
          // metadataUrls is already filtered to human-viewable web pages at parse time (raw XML/data
          // documents are dropped via isWebPageMetadata in externalLayers.utils).
          const metadataUrls = layer.metadataUrls ?? [];
          return (
            <div
              key={`${server.id}:${layer.id}`}
              role="option"
              aria-selected={isActive}
              className={`layer-container external-wms-layer-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                // The Add to Compare/Pins action buttons live inside this row, and their clicks
                // bubble up here. Re-selecting the already-active layer is a no-op, so skip it to
                // avoid a redundant dispatch (the reducer also preserves the chosen date on a
                // same-layer re-select, so the picker keeps its value either way).
                if (isActive) {
                  return;
                }
                dispatch(
                  externalLayersSlice.actions.setActiveExternalLayer({
                    serverId: server.id,
                    layerName: layer.name,
                    layerId: layer.id,
                  }),
                );
              }}
            >
              <div className="layer-header">
                <div className="preview">
                  <img
                    className="icon"
                    src={buildPreviewUrl(server, layer)}
                    alt=""
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = EMPTY_IMAGE_DATA_URI;
                    }}
                  />
                </div>
                <div className="title">
                  <span
                    className={`external-wms-layer-title${isActive ? ' active-title' : ''}`}
                    title={layer.title || layer.name}
                  >
                    {layer.title || layer.name}
                  </span>
                  {layer.abstract && <div className="external-wms-layer-abstract">{layer.abstract}</div>}
                  {layer.timeDimension && (
                    <div className="external-wms-layer-time-dimension">{layer.timeDimension}</div>
                  )}
                </div>
                {isActive && (
                  <div className="icons">
                    <div
                      title={t`Add to`}
                      className={`plus ${layerActionsOpen ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (toggleLayerActions) {
                          toggleLayerActions(e);
                        }
                      }}
                    >
                      <i className={`fas ${layerActionsOpen ? 'fa-minus' : 'fa-plus'}`} /> {t`Add to`}
                    </div>
                  </div>
                )}
              </div>
              {/* Rendered as a full-width row BELOW the header (not inside .title): on the active row
                  the .icons block takes 125px and shrinks .title, which would shift the right-aligned
                  metadata left and misalign it against the other rows. */}
              {(layer.attribution || metadataUrls.length > 0) && (
                <div className="external-wms-layer-meta-row">
                  <div className="external-wms-layer-attribution">
                    {layer.attribution &&
                      (validateWmsUrl(layer.attribution) ? (
                        // Attribution without its own <Title> falls back to the bare OnlineResource
                        // URL (see extractWmsAttribution); show its hostname instead of the full,
                        // often-long URL as the visible text, keeping the full URL in the tooltip.
                        <span onClick={(e) => e.stopPropagation()}>
                          <ExternalLink
                            href={layer.attribution}
                            className="external-wms-layer-attribution-link"
                            title={layer.attribution}
                          >
                            {safeHostname(layer.attribution)}
                          </ExternalLink>
                        </span>
                      ) : (
                        layer.attribution
                      ))}
                  </div>
                  {/* A layer can advertise several MetadataURLs; number them (1-based) when
                      there's more than one. The number is concatenated outside the t`` tagged
                      template so only the word "Metadata" is translated. */}
                  {metadataUrls.length > 0 && (
                    <div className="external-wms-layer-metadata" onClick={(e) => e.stopPropagation()}>
                      {metadataUrls.map((url, idx) => {
                        const label = metadataUrls.length > 1 ? `${t`Metadata`} ${idx + 1}` : t`Metadata`;
                        // metadataUrls come from an untrusted server's GetCapabilities response;
                        // only render as a clickable link when the scheme is http(s), otherwise a
                        // malicious/misconfigured server could hand us a javascript: URI.
                        return validateWmsUrl(url) ? (
                          <ExternalLink
                            key={`${url}-${idx}`}
                            href={url}
                            className="external-wms-layer-metadata-link"
                            title={url}
                          >
                            {label}
                          </ExternalLink>
                        ) : (
                          <span
                            key={`${url}-${idx}`}
                            className="external-wms-layer-metadata-plain"
                            title={url}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              <ActionBar
                className="layer-actions"
                actionsOpen={!!(layerActionsOpen && isActive)}
                actions={layerActions}
              />
            </div>
          );
        })}

        {filtered.length === 0 && <div className="external-wms-layer-empty">{t`No layers match`}</div>}
      </div>

      {/* Always shown (even with a single page) so the layout doesn't jump when switching between
          a paginated service and one with fewer layers. Prev/next disable themselves on a single page. */}
      <div className="external-wms-layer-pagination">
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            aria-label={t`Previous page`}
            onClick={() => setPage((p) => p - 1)}
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
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages - 1}
          >
            <i className="fas fa-chevron-right" />
          </button>
        </div>
        <Select
          value={{ value: pageSize, label: `${pageSize} ${t`per page`}` }}
          options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} ${t`per page`}` }))}
          onChange={(opt) => opt && setPageSize(opt.value)}
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
    </div>
  );
};

export default ExternalWmsLayerContainer;
