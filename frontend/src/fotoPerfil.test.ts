import { afterEach, expect, it, vi } from 'vitest'
import { salvarFoto, removerFoto, validarFoto, LIMITE_FOTO } from './fotoPerfil'
import { ErroDeApi, SessaoEncerrada } from './sessao'
import { instalarFetch, respostaJson } from './testes/ajuda'

afterEach(() => vi.unstubAllGlobals())

it('envia multipart autenticado, devolve a URL do Storage e remove autenticado', async () => {
  const fetch = instalarFetch(({ init }) => init?.method === 'DELETE'
    ? respostaJson(204)
    : respostaJson(200, { avatarUrl: 'https://projeto.supabase.co/storage/v1/object/public/avatars/u/avatar-1.png' }))
  const arquivo = new File(['foto'], 'foto.png', { type: 'image/png' })

  expect(await salvarFoto('token', arquivo)).toBe('https://projeto.supabase.co/storage/v1/object/public/avatars/u/avatar-1.png')
  expect((fetch.mock.calls[0][1]?.body as FormData).get('arquivo')).toBe(arquivo)
  expect(fetch.mock.calls[0][1]?.headers).toEqual({ Authorization: 'Bearer token' })

  await removerFoto('token')
  expect(fetch.mock.calls[1][1]?.method).toBe('DELETE')
})

it('valida formato e limite no cliente', () => {
  expect(validarFoto(new File(['x'], 'x.svg', { type: 'image/svg+xml' }))).toContain('PNG ou JPEG')
  expect(validarFoto(new File([new Uint8Array(LIMITE_FOTO + 1)], 'x.png', { type: 'image/png' }))).toContain('2 MB')
  expect(validarFoto(new File(['x'], 'x.jpg', { type: 'image/jpeg' }))).toBeNull()
})

it('traduz sessao e erro do servidor', async () => {
  instalarFetch(() => respostaJson(401))
  await expect(removerFoto('token')).rejects.toBeInstanceOf(SessaoEncerrada)
  instalarFetch(() => respostaJson(400, { erros: [{ campo: 'foto', mensagem: 'Imagem inválida.' }] }))
  await expect(salvarFoto('token', new File(['x'], 'x.png', { type: 'image/png' }))).rejects.toBeInstanceOf(ErroDeApi)
})
