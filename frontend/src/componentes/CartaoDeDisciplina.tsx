import { Link } from 'react-router-dom'

import type { DisciplinaDashboard } from '../dashboard'
import { contar, formatarPercentual, nivelDeAcertos } from '../desempenho'
import BarraDeDesempenho from './BarraDeDesempenho'
import { TriangleAlertIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  disciplina: DisciplinaDashboard
  editalId: number
  /** Marcada pela analise quando os acertos estao abaixo das demais disciplinas. */
  abaixoDasDemais?: boolean
}

/** Disciplina com duas medidas separadas: quanto foi estudado e quanto se acerta. */
function CartaoDeDisciplina({ disciplina, editalId, abaixoDasDemais = false }: Props) {
  const total = disciplina.topicos.length
  const feitos = disciplina.topicos.filter(t => t.concluido).length
  const temRespostas = disciplina.questoes > 0 && disciplina.desempenho !== null
  const nivel = temRespostas ? nivelDeAcertos(disciplina.desempenho ?? 0) : null

  return (
    <li className={cn('flex flex-col gap-4 rounded-xl border bg-card p-5', abaixoDasDemais && 'border-warning/40 bg-warning-soft/40')}>
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 font-semibold">{disciplina.nome}</h3>
        {abaixoDasDemais && <Badge variant="warning"><TriangleAlertIcon aria-hidden="true" />Abaixo das demais</Badge>}
        <Button asChild variant="outline" size="sm">
          <Link to={`/questoes?curso=${editalId}&disciplina=${disciplina.id}`} aria-label={`Praticar ${disciplina.nome}`}>Praticar</Link>
        </Button>
      </header>
      <BarraDeDesempenho
        rotulo="Estudo"
        valor={total ? (100 * feitos) / total : null}
        texto={`${feitos} de ${contar(total, 'tópico', 'tópicos')}`}
      />
      <BarraDeDesempenho
        rotulo="Acertos"
        valor={temRespostas ? disciplina.desempenho : null}
        nivel={nivel?.classe}
        texto={temRespostas && nivel
          ? `${formatarPercentual(disciplina.desempenho ?? 0)} · ${disciplina.acertos} de ${contar(disciplina.questoes, 'questão', 'questões')} · ${nivel.rotulo}`
          : 'Sem respostas ainda'}
      />
    </li>
  )
}

export default CartaoDeDisciplina
