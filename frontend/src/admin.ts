/**
 * Area admin (HU04): recurso restrito que so ADMIN acessa.
 *
 * <p>Mesmo contrato de `sessao.ts`: token no cabecalho `Authorization` e os
 * mesmos tres erros tipados (`ErroDeApi`, `ErroDeRede`, `SessaoEncerrada`).
 * O 403 chega como `ErroDeApi` com o campo `autorizacao` — a tela mostra a
 * mensagem da API sem encerrar a sessao.
 */
import { requisitarJson } from './api'
import type { PerfilDeAcesso } from './sessao'

export type UsuarioAdmin = {
  id: number
  nome: string
  email: string
  perfil: PerfilDeAcesso
  /** Ausente em respostas antigas; tratado como nao confirmado. */
  emailVerificado?: boolean
  /** Data do cadastro; nula nas contas criadas antes de a plataforma registrar essa data. */
  criadoEm?: string | null
}

export type CadastroRecente = { id: number; nome: string; perfil: PerfilDeAcesso; criadoEm: string }

export type CursoNoResumo = {
  editalId: number
  titulo: string
  sigla: string
  inscritos: number
  questoesPublicadas: number
  questoesEmRascunho: number
}

/** Indicadores da visao geral do painel. */
export type ResumoAdmin = {
  totalAlunos: number
  totalAdministradores: number
  /** Alunos cadastrados nos ultimos 30 dias. */
  novosAlunos30Dias: number
  contasSemConfirmacao: number
  cursosPublicados: number
  editaisAguardandoRevisao: number
  questoesPublicadas: number
  questoesEmRascunho: number
  cursos: CursoNoResumo[]
  /** Ate cinco contas, da mais recente para a mais antiga. */
  cadastrosRecentes: CadastroRecente[]
}

/** Data curta no formato brasileiro (17/10/2026). */
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

/** Lista as contas cadastradas. Rota restrita: so a authority ADMIN passa. */
export const listarUsuarios = (token: string) => requisitarJson<UsuarioAdmin[]>('/api/admin/usuarios', token)

export const buscarResumo = (token: string) => requisitarJson<ResumoAdmin>('/api/admin/resumo', token)

/**
 * Troca o perfil de outra conta. A conta alterada precisa entrar de novo; o
 * backend recusa a troca do proprio perfil.
 */
export const alterarPerfil = (token: string, usuarioId: number, perfil: PerfilDeAcesso) =>
  requisitarJson<UsuarioAdmin>(`/api/admin/usuarios/${usuarioId}/perfil`, token, { metodo: 'PUT', json: { perfil } })
