import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import EditorDeEstruturaDoCurso from './EditorDeEstruturaDoCurso'
import type { EditalAprovado } from '../editais'
import { corpoEnviado, instalarFetch, respostaJson } from '../testes/ajuda'

/** Edicao da estrutura do curso publicado: chamadas certas, confirmacao e validacao. */
describe('EditorDeEstruturaDoCurso', () => {
  afterEach(() => vi.restoreAllMocks())

  const CURSO: EditalAprovado = {
    id: 1, titulo: 'PF 2026', orgao: 'Polícia Federal', sigla: 'PF', ano: 2026, criadoEm: '2026-01-01T00:00:00Z',
    materialPdfUrl: null, possuiPdfOriginal: false, concursos: [], bannerVersao: null,
    disciplinas: [{ id: 10, nome: 'Português', pagina: 1, assuntos: [
      { id: 100, nome: 'Interpretação', pagina: 1, subassuntos: [{ id: 101, nome: 'Tipologia', pagina: 1, subassuntos: [] }] },
      { id: 102, nome: 'Crase', pagina: 2, subassuntos: [] },
    ] }],
  }

  function montar() {
    const onAtualizado = vi.fn()
    const onNotificar = vi.fn()
    render(<EditorDeEstruturaDoCurso token="token" curso={CURSO} onAtualizado={onAtualizado} onNotificar={onNotificar} onEncerrarSessao={vi.fn()} />)
    return { onAtualizado, onNotificar }
  }

  async function abrirDisciplina() {
    await userEvent.click(screen.getByText('Português'))
  }

  it('renomeia um topico com PUT e devolve o curso atualizado', async () => {
    const atualizado = { ...CURSO, titulo: 'atualizado' }
    const fetchFalso = instalarFetch(() => respostaJson(200, atualizado))
    const { onAtualizado, onNotificar } = montar()
    await abrirDisciplina()

    await userEvent.click(screen.getByRole('button', { name: 'Renomear Crase' }))
    const campo = screen.getByLabelText('Novo nome de Crase')
    await userEvent.clear(campo)
    await userEvent.type(campo, 'Crase e acentuação')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    const [url, init] = fetchFalso.mock.calls[0]
    expect(String(url)).toBe('/api/admin/editais/1/conteudos/102')
    expect(init?.method).toBe('PUT')
    expect(corpoEnviado({ url: String(url), init })).toEqual({ nome: 'Crase e acentuação' })
    expect(onAtualizado).toHaveBeenCalledWith(atualizado)
    expect(onNotificar).toHaveBeenCalledWith('sucesso', 'Tópico renomeado.')
  })

  it('inclui subassunto dentro do assunto escolhido', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, CURSO))
    montar()
    await abrirDisciplina()

    await userEvent.click(screen.getByRole('button', { name: 'Incluir subassunto em Crase' }))
    await userEvent.type(screen.getByLabelText('Nome do novo subassunto de Crase'), 'Uso facultativo')
    await userEvent.click(screen.getByRole('button', { name: 'Incluir' }))

    const [url, init] = fetchFalso.mock.calls[0]
    expect(String(url)).toBe('/api/admin/editais/1/disciplinas/10/conteudos')
    expect(corpoEnviado({ url: String(url), init })).toEqual({ nome: 'Uso facultativo', paiId: 102 })
  })

  it('nome vazio mostra o erro no campo sem chamar a API', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, CURSO))
    montar()
    await abrirDisciplina()

    await userEvent.click(screen.getByRole('button', { name: '+ Novo assunto em Português' }))
    await userEvent.click(screen.getByRole('button', { name: 'Incluir' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Informe um nome.')
    expect(screen.getByLabelText('Nome do novo assunto de Português')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('excluir pede confirmacao avisando que o progresso sera apagado', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(200, CURSO))
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true)
    montar()
    await abrirDisciplina()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir Interpretação' }))
    expect(confirmar.mock.calls[0][0]).toMatch(/progresso dos alunos/)
    expect(fetchFalso).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Excluir disciplina Português' }))
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/admin/editais/1/disciplinas/10')
    expect(fetchFalso.mock.calls[0][1]?.method).toBe('DELETE')
  })

  it('cria disciplina com o primeiro assunto e mostra o erro da API', async () => {
    const fetchFalso = instalarFetch(() => respostaJson(400, { erros: [{ campo: 'nome', mensagem: 'Já existe uma disciplina com esse nome neste curso.' }] }))
    const { onNotificar } = montar()

    const formulario = screen.getByRole('form', { name: 'Nova disciplina' })
    await userEvent.type(within(formulario).getByLabelText('Nome da disciplina'), 'Português')
    await userEvent.type(within(formulario).getByLabelText('Primeiro assunto'), 'Ortografia')
    await userEvent.click(within(formulario).getByRole('button', { name: 'Incluir disciplina' }))

    expect(corpoEnviado({ url: String(fetchFalso.mock.calls[0][0]), init: fetchFalso.mock.calls[0][1] }))
      .toEqual({ nome: 'Português', primeiroAssunto: 'Ortografia' })
    expect(onNotificar).toHaveBeenCalledWith('erro', 'Já existe uma disciplina com esse nome neste curso.')
  })
})
