/**
 * Cliente do Supabase usado SOMENTE para autenticacao (Supabase Auth).
 *
 * <p>Os dados da plataforma continuam passando pela API Java em `/api`; o
 * frontend nao consulta tabelas diretamente. A chave usada aqui e a publica
 * (anon/publishable): ela pode ir para o navegador porque o banco esta
 * protegido por RLS (supabase/migrations).
 *
 * <p>A sessao fica no `localStorage` sob a chave `plataforma:sessao` e o
 * access token e renovado automaticamente antes de expirar. O logout remove
 * a sessao do navegador e a revoga no Supabase.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const CHAVE_DA_SESSAO = 'plataforma:sessao'

const url = import.meta.env.VITE_SUPABASE_URL
const chavePublica = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase: SupabaseClient | null =
  url && chavePublica
    ? createClient(url, chavePublica, {
        auth: {
          storageKey: CHAVE_DA_SESSAO,
          persistSession: true,
          autoRefreshToken: true,
          // Links de confirmacao e de redefinicao de senha voltam com a sessao na URL.
          detectSessionInUrl: true,
        },
      })
    : null
