/**
 * Usuario da sessao atual, compartilhado pelas telas autenticadas.
 *
 * <p>Vem de `GET /api/auth/me` depois do login. O papel decide o que a
 * interface mostra (area do aluno ou area administrativa); quem autoriza de
 * verdade continua sendo o backend. `atualizarUsuario` deixa o menu da conta
 * em dia quando o perfil muda nome ou foto.
 */
import { createContext, useContext } from 'react'
import type { Usuario } from './sessao'

export type ContextoDaSessao = {
  usuario: Usuario | null
  atualizarUsuario: (dados: Partial<Usuario>) => void
}

export const SessaoContexto = createContext<ContextoDaSessao>({
  usuario: null,
  atualizarUsuario: () => {},
})

export const useSessao = () => useContext(SessaoContexto)
