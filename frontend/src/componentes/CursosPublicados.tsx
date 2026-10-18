import { Fragment, useEffect, useState } from 'react'

import { excluirEdital, listarEditaisAprovados, type EditalAprovado, type ImportacaoDeEdital } from '../editais'
import { mensagemDaFalha } from '../api'
import Aviso from './Aviso'
import Notificacao, { type DadosDaNotificacao } from './Notificacao'
import Botao from './Botao'
import EstadoCarregando from './EstadoCarregando'
import EstadoVazio from './EstadoVazio'
import Tabela from './Tabela'
import EditorDeCapaDoCurso from './EditorDeCapaDoCurso'

type Props = {
  token: string
  /** Importacoes da tela: quando mudam (aprovacao, exclusao), os cursos recarregam. */
  importacoes?: ImportacaoDeEdital[] | null
  /** Chamado depois que um curso sai, para a tela recarregar as importacoes ligadas. */
  onExcluido?: () => void
  onEncerrarSessao: (motivo?: string) => void
}

/**
 * Cursos publicados (editais aprovados) na area admin. Permite excluir um
 * curso pelo id do edital quando ele nao tem importacao ligada (legados ou
 * criados sem PDF); os demais saem pela tabela de importacoes.
 */
function CursosPublicados({ token, importacoes, onExcluido, onEncerrarSessao }: Props) {
  const [cursos, setCursos] = useState<EditalAprovado[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  // Resultado de excluir vai para o pop-up; o erro de carga continua na secao.
  const [notificacao, setNotificacao] = useState<DadosDaNotificacao | null>(null)
  const [excluindo, setExcluindo] = useState<number | null>(null)
  // Curso com o editor de capa (banner, orgao e sigla) aberto abaixo da linha.
  const [editandoCapa, setEditandoCapa] = useState<number | null>(null)
  const [recarga, setRecarga] = useState(0)
  // Cursos aprovados por uma importacao saem pelo "Excluir" da lista de importacoes.
  const comImportacao = new Set((importacoes ?? []).map((item) => item.editalAprovadoId).filter((id) => id != null))

  useEffect(() => {
    let descartado = false
    listarEditaisAprovados(token)
      .then((lista) => {
        if (descartado) return
        setCursos(lista)
        setErro(null)
      })
      .catch((falha: unknown) => {
        if (descartado) return
        const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível carregar os cursos.')
        if (mensagem) setErro(mensagem)
      })

    return () => {
      descartado = true
    }
  }, [token, onEncerrarSessao, importacoes, recarga])

  async function excluir(curso: EditalAprovado) {
    if (!confirm(`Excluir o curso "${curso.titulo}"? Planos, questões e progresso dos alunos neste curso também serão removidos. Esta ação não pode ser desfeita.`)) {
      return
    }
    setExcluindo(curso.id)
    setNotificacao(null)
    try {
      await excluirEdital(token, curso.id)
      setCursos((atuais) => atuais?.filter((item) => item.id !== curso.id) ?? null)
      setNotificacao({ tipo: 'sucesso', mensagem: `Curso "${curso.titulo}" excluído com sucesso.` })
      onExcluido?.()
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível excluir o curso.')
      if (!mensagem) return
      setNotificacao({ tipo: 'erro', mensagem })
      setRecarga((numero) => numero + 1)
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="titulo-cursos-publicados">
      <h2 id="titulo-cursos-publicados" className="text-lg font-semibold">Cursos publicados</h2>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {notificacao && <Notificacao {...notificacao} onFechar={() => setNotificacao(null)} />}

      {cursos === null && !erro && <EstadoCarregando formato="tabela">Carregando cursos...</EstadoCarregando>}

      {cursos && cursos.length === 0 && <EstadoVazio>Nenhum curso publicado.</EstadoVazio>}

      {cursos && cursos.length > 0 && (
        <Tabela>
          <thead>
            <tr>
              <th scope="col">Curso</th>
              <th scope="col">Órgão</th>
              <th scope="col">Ano</th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((curso) => (
              <Fragment key={curso.id}>
              <tr>
                <td className="min-w-48 font-medium">{curso.titulo}</td>
                <td>{curso.orgao}</td>
                <td>{curso.ano}</td>
                <td>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Botao type="button" variante="secundario" tamanho="pequeno" aria-expanded={editandoCapa === curso.id} aria-controls={`capa-do-curso-${curso.id}`}
                      aria-label={`Editar capa de ${curso.titulo}`} onClick={() => setEditandoCapa(atual => (atual === curso.id ? null : curso.id))}>
                      {editandoCapa === curso.id ? 'Fechar capa' : 'Editar capa'}
                    </Botao>
                  {comImportacao.has(curso.id) ? (
                    <span className="text-xs text-muted-foreground">Excluir pela importação acima</span>
                  ) : (
                      <Botao
                        type="button"
                        variante="fantasma"
                        tamanho="pequeno"
                        className="text-destructive hover:bg-destructive-soft hover:text-destructive"
                        carregando={excluindo === curso.id}
                        aria-label={`Excluir curso ${curso.titulo}`}
                        onClick={() => void excluir(curso)}
                      >
                        Excluir curso
                      </Botao>
                  )}
                  </div>
                </td>
              </tr>
              {editandoCapa === curso.id && <tr id={`capa-do-curso-${curso.id}`} className="bg-muted/30 hover:bg-muted/30">
                <td colSpan={4} className="p-4 sm:p-6">
                  <EditorDeCapaDoCurso token={token} curso={curso} onEncerrarSessao={onEncerrarSessao}
                    onNotificar={(tipo, mensagem) => setNotificacao({ tipo, mensagem })}
                    onAtualizado={mudancas => setCursos(atuais => atuais?.map(item => (item.id === curso.id ? { ...item, ...mudancas } : item)) ?? null)} />
                </td>
              </tr>}
              </Fragment>
            ))}
          </tbody>
        </Tabela>
      )}
    </section>
  )
}

export default CursosPublicados
