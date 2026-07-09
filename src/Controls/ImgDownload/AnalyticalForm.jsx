import React, { useState, useRef, useEffect } from 'react';
import Toggle from 'react-toggle';
import { t } from 'ttag';

import { RESOLUTION_DIVISORS, IMAGE_FORMATS_INFO, RESOLUTION_OPTIONS } from './consts';
import { isTiff, isSimpleImageFormat } from './ImageDownload.utils';
import ExternalLink from '../../ExternalLink/ExternalLink';
import Loader from '../../Loader/Loader';
import { toggleInArray } from '../../utils';

export const CUSTOM_TAG = ' Custom';
const maxLayersToShow = 10;

export default function AnalyticalForm(props) {
  const CAPTIONS_TITLE = t`File will have logo attached.`;
  const DATAMASK_TITLE = t`A dataMask-band will be included in the downloaded raw bands as second band.`;
  const TIFF_BANDS_SELECTION = t`The Tagged Image File Format (TIFF) can hold a large number of bands, however many common image viewers (e.g. Windows Photo Viewer) can't display TIFF images with more than 3 bands.\nIf this option is enabled, only the first 3 bands will be included in the image.\nIf this option is disabled, all bands will be included in the image, but you will have to use an application which supports more than 3 bands (e.g. QGIS) to display the TIFF image.`;

  const {
    imageFormat,
    selectedResolution,
    selectedCrs,
    allLayers,
    allBands,
    showLogo,
    renderImageSize,
    areImageDimensionsValid,
    updateFormData,
    renderCRSResolution,
    onErrorMessage,
    isCurrentLayerCustom,
    customSelected,
    selectedLayers,
    selectedBands,
    updateSelectedLayers,
    updateSelectedBands,
    supportedImageFormats,
    addDataMask,
    allowShowLogoAnalytical,
    clipExtraBandsTiff,
    customResolution,
    getCrsOptions,
    hasActiveEffects,
  } = props;

  const [showMore, setShowMore] = useState(false);

  const prevImageFormatRef = useRef(imageFormat);
  useEffect(() => {
    const prevImageFormat = prevImageFormatRef.current;
    if (prevImageFormat !== imageFormat) {
      if (isSimpleImageFormat(prevImageFormat) && !isSimpleImageFormat(imageFormat)) {
        if (showLogo) {
          // Logo overlay requires a simple image format (PNG, JPG, or WebP); disable it when switching to TIFF/KMZ
          updateFormData('showLogo', false);
        }
        updateFormData('addDataMask', false);
      } else if (!isSimpleImageFormat(prevImageFormat) && isSimpleImageFormat(imageFormat)) {
        updateFormData('addDataMask', true);
      }
    }
    prevImageFormatRef.current = imageFormat;
  }, [imageFormat, showLogo, updateFormData]);

  const isSimpleFormat = isSimpleImageFormat(imageFormat);

  if (allLayers.length === 0) {
    return <Loader />;
  }

  return (
    <div className="analytical-mode">
      {allowShowLogoAnalytical && isSimpleFormat && (
        <div className="form-field">
          <label title={CAPTIONS_TITLE}>
            {t`Show logo`}
            <i
              className="fa fa-info-circle"
              onClick={() => {
                onErrorMessage(CAPTIONS_TITLE);
              }}
            />
          </label>
          <div className="form-input">
            <Toggle checked={showLogo} icons={false} onChange={() => updateFormData('showLogo', !showLogo)} />
          </div>
        </div>
      )}
      <div className="row">
        <label>{t`Image format`}:</label>
        <select
          className="dropdown"
          value={imageFormat}
          onChange={(e) => updateFormData('imageFormat', e.target.value)}
        >
          {supportedImageFormats.map((format) => {
            const isTiffFormat = isTiff(format);
            const isDisabled = hasActiveEffects && isTiffFormat;
            const optionText = isDisabled
              ? IMAGE_FORMATS_INFO[format].text + ' (' + t`not available with effects` + ')'
              : IMAGE_FORMATS_INFO[format].text;
            return (
              <option key={IMAGE_FORMATS_INFO[format].text} value={format} disabled={isDisabled}>
                {optionText}
              </option>
            );
          })}
        </select>
      </div>
      <div className="row">
        <label>{t`Image resolution`}:</label>
        <div className="max-width">
          <select
            className="dropdown"
            value={selectedResolution}
            onChange={(ev) => updateFormData('selectedResolution', ev.target.value)}
          >
            {Object.keys(RESOLUTION_DIVISORS).map((key) => (
              <option key={RESOLUTION_DIVISORS[key].text} value={key}>
                {RESOLUTION_DIVISORS[key].text}
              </option>
            ))}
          </select>
          <small className={!areImageDimensionsValid ? 'error' : ''}>
            {renderImageSize(selectedResolution)}
          </small>
          {!areImageDimensionsValid && (
            <small className="error">{' ' + t`Image width and height must be between 1px and 2500px`}</small>
          )}
        </div>
      </div>
      {selectedResolution === RESOLUTION_OPTIONS.CUSTOM && (
        <>
          <div className="row">
            <label>{t`Resolution X (m/px)` + ':'}</label>
            <input
              min={0}
              type={'number'}
              value={customResolution[0]}
              onChange={(ev) => updateFormData('customResolution', [ev.target.value, customResolution[1]])}
            ></input>
          </div>
          <div className="row">
            <label>{t`Resolution Y (m/px)` + ':'}</label>
            <input
              min={0}
              type={'number'}
              value={customResolution[1]}
              onChange={(ev) => updateFormData('customResolution', [customResolution[0], ev.target.value])}
            ></input>
          </div>
        </>
      )}
      <div className="row">
        <label>{t`Coordinate system` + ':'}</label>

        <div className="max-width">
          <select
            className="dropdown"
            value={selectedCrs}
            onChange={(ev) => updateFormData('selectedCrs', ev.target.value)}
          >
            {getCrsOptions().map((obj) => (
              <option key={obj.text} value={obj.id}>
                {obj.text}
              </option>
            ))}
          </select>
          <small>
            {selectedResolution === RESOLUTION_OPTIONS.CUSTOM
              ? null
              : renderCRSResolution(selectedResolution, selectedCrs)}
          </small>
        </div>
      </div>
      {selectedBands.length > 0 && !isSimpleFormat && (
        <div className="form-field">
          <label title={DATAMASK_TITLE}>
            {t`Add dataMask band to raw layers`}
            <ExternalLink href="https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/UserGuides/Datamask.html">
              <i className="fa fa-info-circle" />
            </ExternalLink>
          </label>
          <div className="form-input">
            <Toggle
              checked={addDataMask}
              icons={false}
              onChange={() => updateFormData('addDataMask', !addDataMask)}
            />
          </div>
        </div>
      )}
      {(customSelected || selectedLayers.length > 0) && isTiff(imageFormat) && (
        <div className="form-field">
          <label>
            {t`Clip extra bands`}
            <i
              className="fa fa-info-circle"
              onClick={() => {
                onErrorMessage(TIFF_BANDS_SELECTION);
              }}
            />
          </label>
          <div className="form-input">
            <Toggle
              checked={clipExtraBandsTiff}
              icons={false}
              onChange={() => updateFormData('clipExtraBandsTiff', !clipExtraBandsTiff)}
            />
          </div>
        </div>
      )}
      <div className="row">
        <label>{t`Layers`}:</label>
        <div className="download-layers">
          <div className="download-layers-columns">
            <div className="column">
              <span className="layer-title">{t`Visualised`}</span>
              {isCurrentLayerCustom && (
                <label key={CUSTOM_TAG}>
                  <input
                    type="checkbox"
                    checked={selectedLayers.includes(CUSTOM_TAG)}
                    onChange={(e) =>
                      updateSelectedLayers(toggleInArray(selectedLayers, CUSTOM_TAG, e.target.checked))
                    }
                  />
                  {CUSTOM_TAG}
                </label>
              )}
              {allLayers.slice(0, showMore ? allLayers.length : maxLayersToShow).map((l) => (
                <label key={l.layerId}>
                  <input
                    type="checkbox"
                    checked={selectedLayers.includes(l.layerId)}
                    onChange={(e) =>
                      updateSelectedLayers(toggleInArray(selectedLayers, l.layerId, e.target.checked))
                    }
                  />{' '}
                  {l.title}
                </label>
              ))}
            </div>
            <div className="column">
              <span className="layer-title">{t`Raw`}</span>
              {allBands.slice(0, showMore ? allBands.length : maxLayersToShow).map((l) => (
                <label key={l.name}>
                  <input
                    type="checkbox"
                    checked={selectedBands.includes(l.name)}
                    onChange={(e) =>
                      updateSelectedBands(toggleInArray(selectedBands, l.name, e.target.checked))
                    }
                  />{' '}
                  {l.name}
                </label>
              ))}
            </div>
          </div>
          {(allLayers.length > maxLayersToShow || allBands.length > maxLayersToShow) && (
            <button className="download-layers-show-more-btn" onClick={() => setShowMore(!showMore)}>
              {showMore ? t`Show less` : t`Show more`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
