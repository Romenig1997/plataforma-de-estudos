import { requisitar } from './api'

export const LIMITE_FOTO = 2 * 1024 * 1024

export function validarFoto(arquivo: File): string | null {
  if (!['image/png', 'image/jpeg'].includes(arquivo.type)) return 'Selecione uma imagem PNG ou JPEG.'
  if (!arquivo.size || arquivo.size > LIMITE_FOTO) return 'Selecione uma imagem de até 2 MB.'
  return null
}

export async function buscarFoto(token: string): Promise<Blob | null> {
  const resposta = await requisitar('/api/perfil/foto', token, { metodo: 'GET' })
  return resposta.status === 204 ? null : await resposta.blob()
}

export async function salvarFoto(token: string, arquivo: File): Promise<Blob> {
  const formulario = new FormData()
  formulario.append('arquivo', arquivo)
  const resposta = await requisitar('/api/perfil/foto', token, { metodo: 'POST', formulario })
  return await resposta.blob()
}

export async function removerFoto(token: string): Promise<void> {
  await requisitar('/api/perfil/foto', token, { metodo: 'DELETE' })
}
