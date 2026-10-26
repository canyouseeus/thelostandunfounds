/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** The camera FTP relay's address (relay/ftp); unset until it is deployed. */
  readonly VITE_FTP_RELAY_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}





