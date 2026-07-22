import { URBAN_ATLAS_WMS_CAPABILITIES_XML } from '../assets/cache/urbanAtlasWmsCapabilities';

const urbanAtlasCapabilitiesRequestRegEx = new RegExp(/mapserver\.dataspace\.copernicus\.eu\/ogc\?/i);

const isUrbanAtlasGetCapabilitiesRequest = ({ url }) => {
  return (
    urbanAtlasCapabilitiesRequestRegEx.test(url) &&
    /request=GetCapabilities/i.test(url) &&
    /service=wms/i.test(url)
  );
};

// The mapserver.dataspace.copernicus.eu WMS GetCapabilities endpoint is public (no admin auth
// needed) but has been unstable; this data doesn't change often, so serve a bundled snapshot
// instead of hitting the network. Regenerate the snapshot with:
// `npm run update-urban-atlas-capabilities-cache`.
export const cachedUrbanAtlasCapabilitiesInterceptor = async (request) => {
  if (isUrbanAtlasGetCapabilitiesRequest(request)) {
    request.adapter = async () => {
      return Promise.resolve({
        data: URBAN_ATLAS_WMS_CAPABILITIES_XML,
        headers: request.headers,
        request: request,
        config: request,
        responseType: request.responseType,
      });
    };
    return request;
  }
  return request;
};
