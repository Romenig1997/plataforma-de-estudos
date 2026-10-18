import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

type Props = {
  rotulo: string
  /** 0 a 100; `null` quando ainda nao ha dados (barra vazia). */
  valor: number | null
  texto: string
  /** Faixa de cor da barra; sem faixa usa a cor de acao. */
  nivel?: 'bom' | 'atencao' | 'fraco'
}

const COR = { bom: 'bg-success', atencao: 'bg-warning', fraco: 'bg-destructive' }

/** Linha "rotulo · barra · texto" usada nos cartoes de disciplina. */
function BarraDeDesempenho({ rotulo, valor, texto, nivel }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="font-medium text-muted-foreground">{rotulo}</span>
        <span className="text-right text-foreground">{texto}</span>
      </div>
      <Progress value={valor ?? 0} aria-label={`${rotulo}: ${texto}`} indicatorClassName={cn(nivel && COR[nivel])} />
    </div>
  )
}

export default BarraDeDesempenho
