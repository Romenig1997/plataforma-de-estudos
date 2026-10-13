import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Estado de carregamento do design system (HU06). Anunciado via
 * `role="status"` para quem usa leitor de tela.
 */
function EstadoCarregando({ children }: Props) {
  return (
    <p className="status-carregando" role="status" aria-live="polite">
      {children}
    </p>
  )
}

export default EstadoCarregando