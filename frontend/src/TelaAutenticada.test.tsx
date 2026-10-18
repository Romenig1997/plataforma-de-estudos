import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TelaAutenticada from './TelaAutenticada'
import { instalarFetch, respostaJson } from './testes/ajuda'

const usuario = { id: 7, nome: 'Ana Souza', email: 'ana@email.com', perfil: 'ALUNO' }
const edital = (id: number, titulo: string) => ({ id, titulo, orgao: 'Órgão', ano: 2026, criadoEm: '', materialPdfUrl: null, possuiPdfOriginal: false, concursos: [], disciplinas: [{ id: id * 10, nome: 'Português', pagina: 1, assuntos: [] }] })
const inscricao = (editalId: number, titulo: string, emFoco: boolean) => ({ editalId, titulo, orgao: 'Órgão', ano: 2026, emFoco, metaHorasSemanais: 10, atualizadoEm: '', totalTopicos: 4, topicosConcluidos: 1, progresso: 25 })

/** Backend em memoria: as acoes de inscricao alteram a lista devolvida. */
function backend() {
  let inscricoes = [inscricao(1, 'Curso CBM', true), inscricao(2, 'Curso PM', false)]
  const fetch = instalarFetch(({ url, init }) => {
    if (url === '/api/auth/me') return respostaJson(200, usuario)
    if (url === '/api/editais') return respostaJson(200, [edital(1, 'Curso CBM'), edital(2, 'Curso PM'), edital(3, 'Curso PRF')])
    if (url === '/api/cursos/inscricoes') return respostaJson(200, inscricoes)
    if (url === '/api/cursos/3/inscricao' && init?.method === 'POST') { inscricoes = [...inscricoes, inscricao(3, 'Curso PRF', false)]; return respostaJson(200, {}) }
    if (url === '/api/cursos/2/inscricao' && init?.method === 'DELETE') { inscricoes = inscricoes.filter(i => i.editalId !== 2); return respostaJson(204) }
    if (url === '/api/cursos/foco') { inscricoes = inscricoes.map(i => ({ ...i, emFoco: i.editalId === 2 })); return respostaJson(200, {}) }
    throw new Error(url)
  })
  return fetch
}

function renderizar() {
  return render(<MemoryRouter initialEntries={['/app']}><Routes>
    <Route path="/app" element={<TelaAutenticada token="token" onEncerrarSessao={vi.fn()} />} />
    <Route path="/curso/:id" element={<p>Tela do curso</p>} />
  </Routes></MemoryRouter>)
}

afterEach(() => vi.unstubAllGlobals())

describe('Meus cursos', () => {
  it('separa os cursos inscritos (foco primeiro) da vitrine', async () => {
    backend()
    renderizar()
    const meus = await screen.findByRole('region', { name: 'Cursos em que você está inscrito' })
    const titulos = within(meus).getAllByRole('article').map(cartao => within(cartao).getByRole('heading').textContent)
    expect(titulos).toEqual(['Curso CBM', 'Curso PM'])
    expect(within(meus).getByText('Em foco')).toBeInTheDocument()
    expect(within(meus).getAllByText('25%')).toHaveLength(2)
    const vitrine = screen.getByRole('region', { name: 'Explorar cursos' })
    expect(within(vitrine).getByRole('heading', { name: 'Curso PRF' })).toBeInTheDocument()
    expect(within(vitrine).queryByText('Curso CBM')).not.toBeInTheDocument()
  })

  it('inscreve pela vitrine e abre o curso', async () => {
    const fetch = backend()
    renderizar()
    const vitrine = await screen.findByRole('region', { name: 'Explorar cursos' })
    await userEvent.click(await within(vitrine).findByRole('button', { name: 'Inscrever-se' }))
    expect(await screen.findByText('Tela do curso')).toBeInTheDocument()
    expect(fetch.mock.calls.find(c => String(c[0]) === '/api/cursos/3/inscricao')?.[1]?.method).toBe('POST')
  })

  it('define outro curso como foco', async () => {
    const fetch = backend()
    renderizar()
    // As opcoes do card ficam no menu ⋯ da capa.
    await userEvent.click(await screen.findByRole('button', { name: 'Mais opções de Curso PM' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Definir como foco' }))
    expect(await screen.findByText('Curso PM agora é o seu curso em foco.')).toBeInTheDocument()
    expect(JSON.parse(String(fetch.mock.calls.find(c => String(c[0]) === '/api/cursos/foco')?.[1]?.body))).toEqual({ editalId: 2 })
  })

  it('cancela a inscricao somente depois de confirmar', async () => {
    const fetch = backend()
    renderizar()
    await screen.findByRole('heading', { name: 'Curso PM' })
    await userEvent.click(screen.getByRole('button', { name: 'Mais opções de Curso PM' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Cancelar inscrição' }))
    expect(fetch.mock.calls.some(c => c[1]?.method === 'DELETE')).toBe(false)
    const confirmacao = screen.getByRole('group', { name: 'Confirmar cancelamento de Curso PM' })
    expect(within(confirmacao).getByText(/Seu progresso fica guardado/)).toBeInTheDocument()
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Cancelar inscrição' }))
    expect(await screen.findByText('Inscrição cancelada. Seu progresso continua guardado.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('region', { name: 'Explorar cursos' })).toHaveTextContent('Curso PM'))
  })

  it('curso em foco fica em destaque no topo e os cards mostram banner e sigla', async () => {
    instalarFetch(({ url }) => {
      if (url === '/api/auth/me') return respostaJson(200, usuario)
      if (url === '/api/editais') return respostaJson(200, [{ ...edital(1, 'Curso CBM'), sigla: 'CBM-PE', bannerVersao: 99 }, edital(2, 'Curso PM')])
      if (url === '/api/cursos/inscricoes') return respostaJson(200, [
        { ...inscricao(1, 'Curso CBM', true), sigla: 'CBM-PE', bannerVersao: 99 },
        { ...inscricao(2, 'Curso PM', false), sigla: 'PM', bannerVersao: null, topicosConcluidos: 0, progresso: 0 },
      ])
      throw new Error(url)
    })
    const { container } = renderizar()
    expect(await screen.findByRole('heading', { name: 'Continue de onde parou' })).toBeInTheDocument()
    const destaque = screen.getByRole('article', { name: 'Curso CBM' })
    expect(destaque).toHaveAttribute('data-destaque', 'true')
    expect(within(destaque).getByText('CBM-PE')).toBeInTheDocument()
    expect(within(destaque).getByRole('link', { name: 'Continuar Curso CBM' })).toHaveTextContent('Continuar estudando')
    expect(container.querySelector('img.curso-capa__imagem')).toHaveAttribute('src', '/api/editais/1/banner?v=99')
    // Sem banner, a capa usa a cor do curso; sem progresso, o botao convida a comecar.
    const outro = screen.getByRole('article', { name: 'Curso PM' })
    expect(outro.querySelector('img')).toBeNull()
    expect(within(outro).getByRole('link', { name: 'Começar Curso PM' })).toBeInTheDocument()
    expect(within(outro).getByText('Ainda não começou')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Seus outros cursos' })).toBeInTheDocument()
    expect(screen.getByText('Meta da semana').nextElementSibling).toHaveTextContent('20h')
  })
})
