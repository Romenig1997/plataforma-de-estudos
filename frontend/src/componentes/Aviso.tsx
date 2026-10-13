import type { ReactNode } from 'react'

type Props = {
  tipo: 'sucesso' | 'erro'
  children: ReactNode
}

/**
 * Aviso de feedback do design system (HU06): sucesso (verde) ou erro
 * (vermelho). Sempre com `role="alert"` e `aria-live="polite"` para que o
 * leitor de tela anuncie quando o aviso entra na pagina.
 */
function Aviso({ tipo, children }: Props) {
  const classe = tipo === 'sucesso' ? 'aviso aviso--sucesso' : 'aviso aviso--erro'
  return (
    <div className={classe} role="alert" aria-live="polite">
      {children}
    </div>
  )
}

export default Aviso