import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Tabela do design system (HU06). O `thead`/`tbody` ficam por conta da tela;
 * o componente garante o padrao visual e a rolagem horizontal em telas
 * estreitas, sem estourar o cartao.
 */
function Tabela({ children }: Props) {
  return (
    <div className="tabela-admin-wrapper">
      <table className="tabela-admin">{children}</table>
    </div>
  )
}

export default Tabela