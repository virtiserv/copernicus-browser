import React, { useState } from 'react';
import { t } from 'ttag';

import './ProductPreview.scss';
import { AttributeNames, AttributeOrbitDirectionValues } from '../../../api/OData/assets/attributes';
import Loader from '../../../Loader/Loader';
import { ResultType, getPlatformShortName, getResultType, normalizeResult } from '../Results.utils';

const getTransformationClass = (product) => {
  //previews for SENTINEL-1 are flipped
  const platformShortName = getPlatformShortName(product);
  if (platformShortName === 'SENTINEL-1') {
    const resultType = getResultType(product);
    if (resultType === ResultType.ODATA) {
      const orbitDirection = product.attributes.find((attr) => attr.Name === AttributeNames.orbitDirection);
      if (orbitDirection?.Value === AttributeOrbitDirectionValues.ASCENDING.value) {
        return 'rotate-flip-horizontal';
      }
    } else {
      // Handle STAC format - orbit direction might be in properties
      const orbitDirection = product.properties?.['sat:orbit_state'];
      if (orbitDirection === 'ascending') {
        return 'rotate-flip-horizontal';
      }
    }

    return 'flip-horizontal';
  }

  return null;
};

const shouldShowPreview = ({ previewUrl, product, previewError, validate }) => {
  if (!previewUrl || !product || previewError) {
    return false;
  }

  //show preview when validation is disabled
  if (!validate) {
    return true;
  }

  return true;
};

const ProductPreview = ({ product = {}, validate = false, isLoading = false, skipNormalization = false }) => {
  // Normalize the product to ensure consistent format. Skipped for callers (e.g. RRD)
  // whose result objects aren't genuine Copernicus OData/STAC search results but can
  // still structurally resemble one (e.g. have a plain `properties` object), which
  // would otherwise cause them to be misclassified and mangled by normalizeSTACResult.
  const normalizedProduct = skipNormalization ? product : normalizeResult(product);
  const { name, previewUrl, className } = normalizedProduct;
  const [previewError, setPreviewError] = useState(false);

  const showPreview = shouldShowPreview({
    previewUrl,
    product: normalizedProduct,
    previewError,
    validate: validate,
  });

  return (
    <div className={`product-preview ${className ? className : ''}`}>
      {isLoading ? (
        <Loader />
      ) : showPreview ? (
        <div className="preview-image">
          <img
            src={previewUrl}
            alt={name}
            loading="lazy"
            onError={() => setPreviewError(true)}
            className={getTransformationClass(normalizedProduct)}
          />
        </div>
      ) : (
        <div className="no-image">{t`No preview available`}</div>
      )}
    </div>
  );
};

export default ProductPreview;
