import { useEffect, useState } from 'react'

import { excluirEdital, listarEditaisAprovados, type EditalAprovado } from '../editais'
import { mensagemDaFalha } from '../api'
import Aviso from './Aviso'
import Botao from './Botao'
import EstadoCarregando from './EstadoCarregando'
import EstadoVazio from './EstadoVazio'
import Tabela from './Tabela'

type Props = {
  token: string
  /** Muda quando a lista de importacoes muda (aprovacao, exclusao): recarrega os cursos. */
  atualizacao?: unknown
  /** Chamado depois que um curso sai, para a tela recarregar as importacoes ligadas. */
  onExcluido?: () => void
  onEncerrarSessao: (motivo?: string) => void
}

/**
 * Cursos publicados (editais aprovados) na area admin. Permite excluir um
 * curso pelo id do edital - inclusive os que nao tem importacao ligada
 * (legados ou criados sem PDF), que nao aparecem na tabela de importacoes.
 */
function CursosPublicados({ token, atualizacao, onExcluido, onEncerrarSessao }: Props) {
  const [cursos, setCursos] = useState<EditalAprovado[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState<number | null>(null)
  const [recarga, setRecarga] = useState(0)

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
  }, [token, onEncerrarSessao, atualizacao, recarga])

  async function excluir(curso: EditalAprovado) {
    if (!confirm(`Excluir o curso "${curso.titulo}"? Planos, questões e progresso dos alunos neste curso também serão removidos. Esta ação não pode ser desfeita.`)) {
      return
    }
    setExcluindo(curso.id)
    setErro(null)
    setAviso(null)
    try {
      await excluirEdital(token, curso.id)
      setCursos((atuais) => atuais?.filter((item) => item.id !== curso.id) ?? null)
      setAviso(`Curso "${curso.titulo}" excluído com sucesso.`)
      onExcluido?.()
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível excluir o curso.')
      if (!mensagem) return
      setErro(mensagem)
      setRecarga((numero) => numero + 1)
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <section className="cursos-publicados" aria-labelledby="titulo-cursos-publicados">
      <h2 id="titulo-cursos-publicados">Cursos publicados</h2>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}

      {cursos === null && !erro && <EstadoCarregando>Carregando cursos...</EstadoCarregando>}

      {cursos && cursos.length === 0 && <EstadoVazio>Nenhum curso publicado.</EstadoVazio>}

      {cursos && cursos.length > 0 && (
        <Tabela>
          <thead>
            <tr>
              <th scope="col">Curso</th>
              <th scope="col">Órgão</th>
              <th scope="col">Ano</th>
              <th scope="col">
                <span className="visualmente-oculto">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((curso) => (
              <tr key={curso.id}>
                <td>{curso.titulo}</td>
                <td>{curso.orgao}</td>
                <td>{curso.ano}</td>
                <td>
                  <div className="acoes acoes--em-linha">
                    <Botao
                      type="button"
                      variante="secundario"
                      carregando={excluindo === curso.id}
                      aria-label={`Excluir curso ${curso.titulo}`}
                      onClick={() => void excluir(curso)}
                    >
                      Excluir curso
                    </Botao>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Tabela>
      )}
    </section>
  )
}

export default CursosPublicados
