/**
 * Foto do perfil (HU03). O backend valida e reduz a imagem, grava no
 * Supabase Storage e devolve a URL publica, que fica salva no perfil.
 */
import { requisitar, requisitarJson } from './api'

export const LIMITE_FOTO = 2 * 1024 * 1024

export function validarFoto(arquivo: File): string | null {
  if (!['image/png', 'image/jpeg'].includes(arquivo.type)) return 'Selecione uma imagem PNG ou JPEG.'
  if (!arquivo.size || arquivo.size > LIMITE_FOTO) return 'Selecione uma imagem de até 2 MB.'
  return null
}

/** Envia a foto e devolve a URL publica dela no Supabase Storage. */
export async function salvarFoto(token: string, arquivo: File): Promise<string> {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  const resposta = await requisitarJson<{ avatarUrl: string }>('/api/perfil/foto', token, { metodo: 'POST', formulario })
  return resposta.avatarUrl
}

export async function removerFoto(token: string): Promise<void> {
  await requisitar('/api/perfil/foto', token, { metodo: 'DELETE' })
}
