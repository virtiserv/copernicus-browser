import React, { Component } from 'react';
import EOBPOIPanelButton from '../../junk/EOBPOIPanelButton/EOBPOIPanelButton';
import { connect } from 'react-redux';
import L from 'leaflet';
import bboxPolygon from '@turf/bbox-polygon';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import './POI.css';

import store, { poiSlice, mainMapSlice, notificationSlice, modalSlice } from '../../store';
import {
  supportsFIS,
  datasetHasAnyFISLayer,
  getDatasetLabel,
} from '../../Tools/SearchPanel/dataSourceHandlers/dataSourceHandlers';
import { getFixedSizeBBoxBounds, getLeafletBoundsFromGeoJSON } from '../../utils/geojson.utils';
import { ModalId } from '../../const';
import pin from './pin.png';

class POI extends Component {
  state = {
    placingMarker: false,
  };
  POILayerRef = null;

  componentDidMount() {
    L.DomEvent.disableScrollPropagation(this.ref);
    L.DomEvent.disableClickPropagation(this.ref);
    this.props.map.on('pm:create', (e) => {
      if (e.shape && e.shape === 'Marker') {
        this.props.map.removeLayer(e.layer);
        this.props.map.pm.disableDraw('Marker');
        const latlng = e.layer.getLatLng();
        const geometry = bboxPolygon(getFixedSizeBBoxBounds(latlng.lat, latlng.lng)).geometry;
        store.dispatch(
          poiSlice.actions.set({
            position: latlng,
            geometry: geometry,
            bounds: getLeafletBoundsFromGeoJSON(geometry),
          }),
        );
        this.enableEdit();
      }
    });

    L.Marker.prototype.options.icon = L.icon({
      iconUrl: pin,
      iconAnchor: [13, 40],
    });

    L.Marker.prototype.options.draggable = true;
  }

  componentDidUpdate(prevProps) {
    if (
      this.props.poiPosition &&
      (!prevProps.poiPosition || this.props.poiPosition !== prevProps.poiPosition)
    ) {
      this.enableEdit();
    }
  }

  enableEdit = () => {
    this.props.map.eachLayer((l) => {
      if (l.options.id && l.options.id === 'poi-layer') {
        this.POILayerRef = l;
      }
    });

    if (!this.POILayerRef) {
      return;
    }

    this.POILayerRef.off('dragend');

    if (this.POILayerRef.dragging) {
      this.POILayerRef.dragging.enable();
    }

    this.POILayerRef.on('dragend', (f) => {
      const latlng = f.target.getLatLng();
      const geometry = bboxPolygon(getFixedSizeBBoxBounds(latlng.lat, latlng.lng)).geometry;
      store.dispatch(
        poiSlice.actions.set({
          position: latlng,
          geometry: geometry,
          bounds: getLeafletBoundsFromGeoJSON(geometry),
        }),
      );
    });
  };

  onStartPlacingMarker = () => {
    this.setState({ placingMarker: true });
    this.props.map.pm.enableDraw('Marker', {
      markerStyle: {
        draggable: true,
      },
    });
  };

  resetPOI = () => {
    this.setState({ placingMarker: false });
    this.props.map.pm.disableDraw('Marker');
    store.dispatch(poiSlice.actions.reset());
  };

  centerMapOnMarker = () => {
    if (!this.POILayerRef) {
      return;
    }
    store.dispatch(mainMapSlice.actions.setPosition(this.POILayerRef.getLatLng()));
  };

  openFISPanel = (params = {}) => {
    store.dispatch(
      modalSlice.actions.addModal({ modal: ModalId.FIS, params: { ...params, poiOrAoi: 'poi' } }),
    );
  };

  generateSelectedResult = () => {
    const { layerId, datasetId, visualizationUrl, customSelected } = this.props;
    if (!layerId && !customSelected) {
      return null;
    }
    if (!customSelected && !datasetHasAnyFISLayer(datasetId)) {
      return { name: getDatasetLabel(datasetId), preset: layerId, baseUrls: { FIS: false } };
    }
    if (!supportsFIS(visualizationUrl, datasetId, layerId, customSelected)) {
      return { name: layerId, preset: layerId, baseUrls: { FIS: false } };
    }
    return { preset: layerId, baseUrls: { FIS: true } };
  };

  render() {
    return (
      <div
        ref={(r) => {
          this.ref = r;
        }}
        className={`poi-wrapper ${this.props.className}`}
      >
        <EOBPOIPanelButton
          disabled={false}
          active={this.state.placingMarker}
          drawMarker={this.onStartPlacingMarker}
          deleteMarker={this.resetPOI}
          centerOnFeature={this.centerMapOnMarker}
          poi={this.props.poiPosition}
          openFisPopup={this.openFISPanel}
          selectedResult={this.generateSelectedResult()}
          presetLayerName={'True color'} // TO DO
          fisShadowLayer={true} // TO DO
          onErrorMessage={(msg) => store.dispatch(notificationSlice.actions.displayError(msg))}
          fisOpened={this.props.modalId === ModalId.FIS}
        />
      </div>
    );
  }
}

const mapStoreToProps = (store) => ({
  poiPosition: store.poi.position,
  layerId: store.visualization.layerId,
  datasetId: store.visualization.datasetId,
  visualizationUrl: store.visualization.visualizationUrl,
  customSelected: store.visualization.customSelected,
  modalId: store.modal.id,
});

export default connect(mapStoreToProps, null)(POI);
