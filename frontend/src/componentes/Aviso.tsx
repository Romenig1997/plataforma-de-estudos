import type { ReactNode } from 'react'
import { CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

type Props = {
  tipo: 'sucesso' | 'erro' | 'atencao' | 'info'
  children: ReactNode
}

const VARIANTE = { sucesso: 'success', erro: 'destructive', atencao: 'warning', info: 'info' } as const
const ICONE = { sucesso: CircleCheckIcon, erro: CircleAlertIcon, atencao: TriangleAlertIcon, info: InfoIcon }

/**
 * Aviso de feedback (Alert do shadcn/ui). Sucesso e erro usam `role="alert"`
 * para o leitor de tela anunciar na hora; atencao e info sao orientacoes da
 * pagina e usam `role="status"`, sem interromper a leitura.
 */
function Aviso({ tipo, children }: Props) {
  const urgente = tipo === 'sucesso' || tipo === 'erro'
  const Icone = ICONE[tipo]
  return (
    <Alert variant={VARIANTE[tipo]} role={urgente ? 'alert' : 'status'} aria-live="polite" data-tipo={tipo}>
      <Icone aria-hidden="true" />
      <AlertDescription className="text-current">{children}</AlertDescription>
    </Alert>
  )
}

export default Aviso
