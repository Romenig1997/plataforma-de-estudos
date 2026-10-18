import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: 'primario' | 'secundario' | 'perigo' | 'fantasma'
  tamanho?: 'padrao' | 'pequeno' | 'grande'
  /** Desabilita o botao enquanto uma acao esta em andamento. */
  carregando?: boolean
  children: ReactNode
}

const VARIANTES = { primario: 'default', secundario: 'outline', perigo: 'destructive', fantasma: 'ghost' } as const
const TAMANHOS = { padrao: 'default', pequeno: 'sm', grande: 'lg' } as const

/**
 * Botao padrao do design system, sobre o Button do shadcn/ui.
 *
 * <p>`carregando` desabilita o botao e mostra um indicador girando; o texto
 * exibido (ex.: "Entrando...") continua sendo decidido pela tela.
 */
function Botao({ variante = 'primario', tamanho = 'padrao', carregando = false, disabled, className, children, ...resto }: Props) {
  return (
    <Button
      variant={VARIANTES[variante]}
      size={TAMANHOS[tamanho]}
      data-variante={variante}
      aria-busy={carregando || undefined}
      disabled={disabled || carregando}
      className={className}
      {...resto}
    >
      {carregando && <Loader2Icon className="animate-spin" aria-hidden="true" />}
      {children}
    </Button>
  )
}

export default Botao
