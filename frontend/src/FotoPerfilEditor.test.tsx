import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FotoPerfilEditor from './FotoPerfilEditor'
import { instalarFetch, respostaJson } from './testes/ajuda'

const URL_DO_STORAGE = 'https://projeto.supabase.co/storage/v1/object/public/avatars/u/avatar-2.png'
const props = (avatarUrl: string | null = null) => ({
  token: 'token',
  avatarUrl,
  onEncerrarSessao: vi.fn(),
  onFotoAlterada: vi.fn(),
})
const arquivo = () => new File(['imagem'], 'foto.png', { type: 'image/png' })

let revogar = vi.fn<(url: string) => void>()
beforeEach(() => {
  let i = 0
  revogar = vi.fn<(url: string) => void>()
  const OriginalURL = URL
  vi.stubGlobal('URL', class extends OriginalURL {
    static createObjectURL = vi.fn(() => `blob:foto-${++i}`)
    static revokeObjectURL = revogar
  })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

it('previa nao salva ate confirmar e o envio devolve a URL do Storage', async () => {
  const fetch = instalarFetch(() => respostaJson(200, { avatarUrl: URL_DO_STORAGE }))
  const p = props()
  render(<FotoPerfilEditor {...p} />)

  await userEvent.upload(screen.getByLabelText('Selecionar foto'), arquivo())
  expect(screen.getByAltText('Prévia da nova foto do perfil')).toHaveAttribute('src', 'blob:foto-1')
  expect(fetch).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: 'Salvar foto' }))
  expect(await screen.findByText('Foto atualizada com sucesso.')).toBeInTheDocument()
  expect(p.onFotoAlterada).toHaveBeenCalledWith(URL_DO_STORAGE)
  expect(revogar).toHaveBeenCalledWith('blob:foto-1')
})

it('exibe a foto atual pela URL publica', () => {
  render(<FotoPerfilEditor {...props(URL_DO_STORAGE)} />)
  expect(screen.getByAltText('Foto atual do perfil')).toHaveAttribute('src', URL_DO_STORAGE)
})

it('informa quando a imagem do Storage nao carrega', () => {
  render(<FotoPerfilEditor {...props(URL_DO_STORAGE)} />)
  fireEvent.error(screen.getByAltText('Foto atual do perfil'))
  expect(screen.getByText('Não foi possível carregar sua foto agora.')).toBeInTheDocument()
})

it('formato e tamanho invalidos nao sao enviados', async () => {
  const fetch = instalarFetch(() => respostaJson(200, { avatarUrl: URL_DO_STORAGE }))
  render(<FotoPerfilEditor {...props()} />)
  const usuario = userEvent.setup({ applyAccept: false })

  await usuario.upload(screen.getByLabelText('Selecionar foto'), new File(['svg'], 'foto.svg', { type: 'image/svg+xml' }))
  expect(screen.getAllByText('Selecione uma imagem PNG ou JPEG.').length).toBeGreaterThan(0)
  await usuario.upload(screen.getByLabelText('Selecionar foto'), new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'grande.png', { type: 'image/png' }))
  expect(screen.getAllByText('Selecione uma imagem de até 2 MB.').length).toBeGreaterThan(0)
  expect(screen.getByLabelText('Selecionar foto')).toHaveAttribute('aria-invalid', 'true')
  expect(fetch).not.toHaveBeenCalled()
})

it('erro de envio preserva a foto atual e permite cancelar a selecao', async () => {
  instalarFetch(() => respostaJson(400, { erros: [{ campo: 'foto', mensagem: 'Arquivo inválido.' }] }))
  const p = props(URL_DO_STORAGE)
  render(<FotoPerfilEditor {...p} />)

  await userEvent.upload(screen.getByLabelText('Selecionar foto'), arquivo())
  await userEvent.click(screen.getByRole('button', { name: 'Salvar foto' }))
  await screen.findAllByText('Arquivo inválido.')
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar seleção' }))

  expect(screen.getByAltText('Foto atual do perfil')).toHaveAttribute('src', URL_DO_STORAGE)
  expect(p.onFotoAlterada).not.toHaveBeenCalled()
})

it('remove a foto e informa a alteracao', async () => {
  instalarFetch(() => respostaJson(204))
  const p = props(URL_DO_STORAGE)
  render(<FotoPerfilEditor {...p} />)

  await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }))
  expect(await screen.findByText('Foto removida.')).toBeInTheDocument()
  expect(p.onFotoAlterada).toHaveBeenCalledWith(null)
})

it('envio com sessao expirada encerra a sessao', async () => {
  instalarFetch(() => respostaJson(401))
  const p = props()
  render(<FotoPerfilEditor {...p} />)

  await userEvent.upload(screen.getByLabelText('Selecionar foto'), arquivo())
  await userEvent.click(screen.getByRole('button', { name: 'Salvar foto' }))
  await vi.waitFor(() => expect(p.onEncerrarSessao).toHaveBeenCalledWith('Sua sessão expirou. Faça login novamente.'))
})
