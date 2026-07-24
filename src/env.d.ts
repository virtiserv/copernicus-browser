/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CDSE_BACKEND: string;
  readonly VITE_ROOT_URL: string;
  readonly VITE_GOOGLE_API_KEY: string;
  readonly VITE_MAPBOX_API_KEY: string;
  readonly VITE_SH_CLIENT_ID: string;
  readonly VITE_SH_DOMAIN_VALIDATION_URL: string;
  readonly VITE_JIRA_DOMAIN: string;
  readonly VITE_JIRA_PROJECT_KEY: string;
  readonly VITE_ANALYTICS_ENABLED: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  API_ENDPOINT_CONFIG?: {
    SH_SERVICES_URL: string;
    AUTH_BASEURL: string;
    OPENEO_BASEURL: string;
    VECTOR_DATA_BASEURL: string;
    STAC_BASEURL: string;
  };
}
