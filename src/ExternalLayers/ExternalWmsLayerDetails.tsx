import React from 'react';

import Legend from '../Tools/VisualizationPanel/Legend';

interface Props {
  detailsOpen: boolean;
  legendUrl?: string;
  abstract?: string;
}

// Collapsible details for an external WMS/WMTS layer row. Mirrors the non-WMS
// src/Tools/VisualizationPanel/VisualizationLayer/LayerDetails.jsx pattern: renders nothing when
// collapsed, otherwise shows the layer's legend (reusing the shared Legend component, which renders
// an image legendUrl via LegendFromUrl with a spinner + hide-on-error) plus the full abstract.
// Scoped under .external-wms-layer-details (not .layer-details) so VisualizationPanel-specific
// layout rules don't leak onto the WMS rows.
const ExternalWmsLayerDetails = ({ detailsOpen, legendUrl, abstract }: Props) => {
  if (!detailsOpen) {
    return null;
  }
  return (
    <div className="external-wms-layer-details" onClick={(e) => e.stopPropagation()}>
      {legendUrl && <Legend legendUrl={legendUrl} />}
      {abstract && <div className="external-wms-layer-details-abstract">{abstract}</div>}
    </div>
  );
};

export default ExternalWmsLayerDetails;
