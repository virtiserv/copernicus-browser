import axios from 'axios';
import fs from 'fs';
import path from 'path';

const URBAN_ATLAS_CAPABILITIES_URL =
  'https://mapserver.dataspace.copernicus.eu/ogc?service=wms&request=GetCapabilities&format=text/xml';

const outputPath = path.join('./src/assets/cache/', 'urbanAtlasWmsCapabilities.js');

async function run() {
  const { data } = await axios.get(URBAN_ATLAS_CAPABILITIES_URL, { responseType: 'text' });
  const escapedXml = data.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  const fileContent = `// Generated file – do not edit manually.
// Regenerate with \`npm run update-urban-atlas-capabilities-cache\`.
export const URBAN_ATLAS_WMS_CAPABILITIES_XML = \`${escapedXml}\`;
`;
  fs.writeFileSync(outputPath, fileContent);
  console.log(`Wrote ${outputPath}`);
}

run().catch((ex) => {
  console.error(ex);
  process.exit(1);
});
