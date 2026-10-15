import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type CabecalhoProps = {
  sobretitulo: string
  titulo: string
  descricao?: ReactNode
  /** Acoes do cabecalho: a primeira e a principal da pagina. */
  acoes?: ReactNode
}

/**
 * Cabecalho padrao das paginas da area do aluno: contexto (sobretitulo),
 * titulo `h1`, uma linha de descricao e as acoes da pagina a direita.
 */
export function CabecalhoDaPagina({ sobretitulo, titulo, descricao, acoes }: CabecalhoProps) {
  return (
    <header className="pagina-cabecalho">
      <div>
        <span className="sobretitulo">{sobretitulo}</span>
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </div>
      {acoes && <div className="pagina-cabecalho__acoes">{acoes}</div>}
    </header>
  )
}

type IndicadorProps = { rotulo: string; valor: ReactNode; detalhe?: ReactNode }

/** Numero-chave da pagina (progresso, acertos, proxima atividade). */
export function Indicador({ rotulo, valor, detalhe }: IndicadorProps) {
  return (
    <div className="indicador">
      <span className="indicador__rotulo">{rotulo}</span>
      <strong className="indicador__valor">{valor}</strong>
      {detalhe && <span className="indicador__detalhe">{detalhe}</span>}
    </div>
  )
}

type EstadoProps = { titulo: string; children: ReactNode; acao?: { texto: string; para: string } }

/** Estado vazio com orientacao e um proximo passo. */
export function EstadoSemDados({ titulo, children, acao }: EstadoProps) {
  return (
    <section className="estado-pagina estado-pagina--embutido" role="status">
      <h2>{titulo}</h2>
      <p>{children}</p>
      {acao && <div className="estado-pagina__acoes"><Link className="botao-link" to={acao.para}>{acao.texto}</Link></div>}
    </section>
  )
}

export function Painel({ titulo, id, children, acao }: { titulo: string; id: string; children: ReactNode; acao?: ReactNode }) {
  return (
    <section className="painel" aria-labelledby={id}>
      <header className="painel__cabecalho">
        <h2 id={id}>{titulo}</h2>
        {acao}
      </header>
      {children}
    </section>
  )
}
