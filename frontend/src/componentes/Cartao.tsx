import type { ReactNode } from 'react'

type Props = {
  /** Largura maior, para telas que precisam de mais espaco (ex.: area admin). */
  largo?: boolean
  titulo: string
  descricao?: string
  children: ReactNode
}

/**
 * Cartao do design system (HU06): a "folha" central das telas. Centraliza o
 * titulo em cabecalho proprio, mantendo a hierarquia de heading em `h1`.
 */
function Cartao({ largo = false, titulo, descricao, children }: Props) {
  const classe = largo ? 'cartao cartao--largo' : 'cartao'
  return (
    <section className={classe}>
      <header className="cartao__cabecalho">
        <h1>{titulo}</h1>
        {descricao && <p>{descricao}</p>}
      </header>
      {children}
    </section>
  )
}

export default Cartao