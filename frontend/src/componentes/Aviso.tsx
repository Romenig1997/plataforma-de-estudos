import type { ReactNode } from 'react'

type Props = {
  tipo: 'sucesso' | 'erro' | 'atencao' | 'info'
  children: ReactNode
}

/**
 * Aviso de feedback do design system (HU06). Sucesso e erro usam
 * `role="alert"` para o leitor de tela anunciar na hora; atencao e info sao
 * orientacoes da pagina e usam `role="status"`, sem interromper a leitura.
 */
function Aviso({ tipo, children }: Props) {
  const urgente = tipo === 'sucesso' || tipo === 'erro'
  return (
    <div className={`aviso aviso--${tipo}`} role={urgente ? 'alert' : 'status'} aria-live="polite">
      {children}
    </div>
  )
}

export default Aviso
