import { TextDecoder, TextEncoder } from 'util';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// Force a deterministic value regardless of the developer's local .env (e.g. a local backend URL
// used for manual pins/timelapses testing) — SocialShare.test.js mocks network requests against
// this exact backend URL, since `import.meta.env.VITE_*` is compiled to `process.env.VITE_*` by
// babel-plugin-transform-vite-meta-env. CI never has a local .env (it's removed before tests run)
// and sets VITE_CDSE_BACKEND explicitly, so it already points at this same production backend.
process.env.VITE_CDSE_BACKEND = 'https://sh.dataspace.copernicus.eu/api/v1/pins/';

global.TextDecoder = TextDecoder;
global.TextEncoder = TextEncoder;
global.window.API_ENDPOINT_CONFIG = {
  SH_SERVICES_URL: 'https://sh.dataspace.copernicus.eu',
  AUTH_BASEURL: 'https://identity.dataspace.copernicus.eu',
};

// Mock import.meta globally - This must happen at module load time
// Jest will see this during module transformation
Object.defineProperty(global, 'import', {
  value: {
    meta: {
      env: {
        VITE_CDSE_BACKEND: process.env.VITE_CDSE_BACKEND || '',
        VITE_ROOT_URL: process.env.VITE_ROOT_URL || '',
        VITE_GOOGLE_API_KEY: process.env.VITE_GOOGLE_API_KEY || '',
        VITE_MAPBOX_API_KEY: process.env.VITE_MAPBOX_API_KEY || '',
        VITE_SH_CLIENT_ID: process.env.VITE_SH_CLIENT_ID || '',
      },
    },
  },
  writable: false,
  configurable: true,
});
