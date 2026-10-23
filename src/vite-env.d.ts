/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CONTACT_PHONE?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_CONTACT_ADDRESS?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_ADSENSE_SLOT?: string;
  readonly VITE_ADS_FOR_MEMBERS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
