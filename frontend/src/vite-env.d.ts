/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL do projeto Supabase (Settings -> API -> Project URL). */
  readonly VITE_SUPABASE_URL?: string
  /** Chave publica do projeto (anon ou publishable). Nunca a service_role. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
