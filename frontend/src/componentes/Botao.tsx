import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario'
  /** Desabilita o botao enquanto uma acao esta em andamento. */
  carregando?: boolean
  children: ReactNode
}

/**
 * Botao padrao do design system (HU06).
 *
 * <p>Duas variantes: `primario` (acao principal, fundo de destaque) e
 * `secundario` (acao alternativa, fundo branco com borda). `carregando`
 * desabilita o botao para o estado de envio, mas quem decide o texto exibido
 * (ex.: "Entrando...") e a tela, via `children`.
 */
function Botao({ variante = 'primario', carregando = false, disabled, children, ...resto }: Props) {
  const classe = variante === 'secundario' ? 'btn-secundario' : 'btn-enviar'
  return (
    <button className={classe} disabled={disabled || carregando} {...resto}>
      {children}
    </button>
  )
}

export default Botao