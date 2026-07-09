import React from 'react';
import { GeoJSON as LeafletGeoJSON, FeatureGroup, type GeoJSONProps } from 'react-leaflet';
import { LeafletMouseEvent, type PathOptions } from 'leaflet';

import store, { commercialDataSlice } from '../../store';
import PreviewLayer from '../../Tools/Results/PreviewLayer';
import { highlightedTileStyle } from '../const';

// react-leaflet v4's GeoJSONProps type omits Leaflet's `style` option even though the
// underlying leaflet GeoJSON layer honours it at runtime, so it's cast back in here.
const GeoJSON = LeafletGeoJSON as React.ComponentType<GeoJSONProps & { style?: () => PathOptions }>;

type CommercialDataResult = {
  id: string;
  geometry: GeoJSON.Geometry;
};

type CommercialDataOrder = {
  id: string;
  input?: {
    bounds?: {
      geometry?: GeoJSON.Geometry;
    };
  };
};

type Props = {
  displaySearchResults: boolean;
  highlightedResult: CommercialDataResult | null;
  searchResults: CommercialDataResult[];
  selectedOrder: CommercialDataOrder | null;
};

const selectedOrderStyle = () => ({
  weight: 2,
  color: 'green',
  opacity: 1,
  fillColor: 'green',
  fillOpacity: 0.3,
});

const CommercialDataOverlay = ({
  displaySearchResults,
  highlightedResult,
  searchResults,
  selectedOrder,
}: Props) => {
  return (
    <>
      {displaySearchResults && !!highlightedResult && (
        <GeoJSON
          data={highlightedResult.geometry}
          key={highlightedResult.id}
          style={() => highlightedTileStyle}
        />
      )}

      {displaySearchResults && searchResults.length > 0 && (
        <FeatureGroup
          eventHandlers={{
            click: (e: LeafletMouseEvent) => {
              store.dispatch(
                commercialDataSlice.actions.setLocation({ lat: e.latlng.lat, lng: e.latlng.lng }),
              );
            },
          }}
        >
          {searchResults.map((result, i) => (
            <PreviewLayer tile={result} key={`preview-layer-${i}`} />
          ))}
        </FeatureGroup>
      )}

      {!!selectedOrder?.input?.bounds?.geometry && (
        <GeoJSON
          data={selectedOrder.input.bounds.geometry}
          key={selectedOrder.id}
          style={selectedOrderStyle}
        />
      )}
    </>
  );
};

export default CommercialDataOverlay;
