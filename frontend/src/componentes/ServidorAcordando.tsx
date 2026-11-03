import { useEffect, useState } from 'react'
import { CoffeeIcon, ServerIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

type Props = {
  /** Botao para desistir de esperar (volta ao login). */
  onCancelar?: () => void
}

/** Tempo tipico para o plano gratuito acordar; a barra enche nesse intervalo. */
const TEMPO_ESPERADO_S = 60

/**
 * Tela de espera enquanto o backend gratuito acorda. Cobre a pagina inteira
 * para a pessoa nao achar que o login falhou; quando o servidor responde, quem
 * a abriu fecha sozinho e segue o fluxo normal.
 */
export default function ServidorAcordando({ onCancelar }: Props) {
  const [segundos, setSegundos] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setSegundos((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const progresso = Math.min(95, Math.round((segundos / TEMPO_ESPERADO_S) * 100))
  const passouDoEsperado = segundos >= TEMPO_ESPERADO_S

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-servidor-acordando"
        aria-describedby="texto-servidor-acordando"
        className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border bg-card p-8 text-center shadow-xl shadow-brand-navy/10"
      >
        <div className="relative flex size-20 items-center justify-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full bg-primary/15 motion-safe:animate-ping" />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ServerIcon className="size-9" />
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h2 id="titulo-servidor-acordando" className="text-2xl font-bold tracking-tight text-balance">
            Só um instante…
          </h2>
          <p id="texto-servidor-acordando" className="text-pretty text-muted-foreground">
            O servidor gratuito está acordando, isso pode levar até 1 minuto no primeiro acesso.
            Assim que ele responder, você entra automaticamente.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Progress value={progresso} aria-label="Andamento da espera" />
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
            {passouDoEsperado ? 'Está demorando um pouco mais que o normal, continuamos tentando…' : `Aguardando há ${segundos} s`}
          </p>
        </div>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CoffeeIcon className="size-4 shrink-0" aria-hidden="true" />
          Depois do primeiro acesso, o site fica rápido.
        </p>

        {onCancelar && (
          <Button type="button" variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </section>
    </div>
  )
}
