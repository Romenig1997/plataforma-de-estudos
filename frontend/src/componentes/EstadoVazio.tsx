import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Estado vazio do design system (HU06): exibido quando um recurso existe mas
 * nao tem dados a mostrar (ex.: nenhum usuario cadastrado).
 */
function EstadoVazio({ children }: Props) {
  return (
    <p className="status-carregando" role="status">
      {children}
    </p>
  )
}

export default EstadoVazio