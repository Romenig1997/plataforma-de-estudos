import { DIAS, avisoDeHorasAcimaDaMeta, minutosDisponiveis, type Disponibilidade, type LinhaDeHorario } from '../cronograma'
import { formatarTempo } from '../planner'
import Aviso from './Aviso'
import Botao from './Botao'
import CampoFormulario from './CampoFormulario'
import { CopyIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Props = {
  linhas: LinhaDeHorario[]
  metaEmMinutos: number
  erros: Record<string, string>
  salvando: boolean
  onLinhas: (atualizar: (linhas: LinhaDeHorario[]) => LinhaDeHorario[]) => void
  onSalvar: () => void
}

const DIAS_UTEIS = [2, 3, 4, 5]
const proximaChave = (linhas: LinhaDeHorario[]) => Math.max(0, ...linhas.map(l => l.chave)) + 1

/**
 * Grade semanal de horarios livres: uma linha por dia, cada uma com seus
 * intervalos. A lista continua plana (diaSemana em cada linha), como a API espera.
 */
function EditorDeDisponibilidade({ linhas, metaEmMinutos, erros, salvando, onLinhas, onSalvar }: Props) {
  const disponibilidade = minutosDisponiveis(linhas)
  const falta = metaEmMinutos - disponibilidade
  const excesso = avisoDeHorasAcimaDaMeta(disponibilidade, metaEmMinutos)
  const segunda = linhas.filter(l => l.diaSemana === 1)
  const editar = (chave: number, campo: keyof Disponibilidade, valor: string) =>
    onLinhas(ls => ls.map(l => (l.chave === chave ? { ...l, [campo]: valor } : l)))
  const adicionar = (diaSemana: number) => onLinhas(ls => [...ls, { chave: proximaChave(ls), diaSemana, inicio: '', fim: '' }])
  // Repete os horarios de segunda de terca a sexta, substituindo o que havia nesses dias.
  const copiarSegunda = () => onLinhas(ls => {
    const base = ls.filter(l => !DIAS_UTEIS.includes(l.diaSemana))
    let chave = proximaChave(ls)
    const copias = DIAS_UTEIS.flatMap(diaSemana => ls.filter(l => l.diaSemana === 1).map(l => ({ ...l, diaSemana, chave: chave++ })))
    return [...base, ...copias]
  })

  return (
    <form onSubmit={e => { e.preventDefault(); onSalvar() }} noValidate>
      <fieldset className="flex min-w-0 flex-col gap-5 disabled:opacity-70" disabled={salvando}>
        <legend className="sr-only">Disponibilidade de estudo</legend>
        <p className="text-sm text-muted-foreground">Estes horários valem para todas as semanas: a agenda se renova sozinha a cada segunda-feira, começando pelos conteúdos que você ainda não concluiu. Sessões de até 60 minutos, no seu horário local.</p>
        {erros.semanaInicio && <Aviso tipo="erro">{erros.semanaInicio}</Aviso>}

        <div className="flex flex-col divide-y rounded-xl border">
          {DIAS.map((nomeDoDia, i) => {
            const diaSemana = i + 1
            const doDia = linhas.filter(l => l.diaSemana === diaSemana)
            return <fieldset key={nomeDoDia} className="flex min-w-0 flex-col gap-3 p-4 md:flex-row md:items-start">
              <legend className="sr-only">{nomeDoDia}</legend>
              <span className="w-28 shrink-0 pt-2 text-sm font-semibold" aria-hidden="true">{nomeDoDia}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                {!doDia.length && <p className="pt-2 text-sm text-muted-foreground">Sem estudo</p>}
                {doDia.map((l, n) => {
                  const nome = `${nomeDoDia}, horário ${n + 1}`
                  return <div key={l.chave} className="flex flex-wrap items-end gap-3">
                    <CampoFormulario id={`inicio-${l.chave}`} rotulo="Início" erro={erros[`inicio-${l.chave}`]} className="w-32">
                      <Input type="time" aria-label={`Início — ${nome}`} value={l.inicio} onChange={e => editar(l.chave, 'inicio', e.target.value)} />
                    </CampoFormulario>
                    <CampoFormulario id={`fim-${l.chave}`} rotulo="Fim" erro={erros[`fim-${l.chave}`]} className="w-32">
                      <Input type="time" aria-label={`Fim — ${nome}`} value={l.fim} onChange={e => editar(l.chave, 'fim', e.target.value)} />
                    </CampoFormulario>
                    <Button type="button" variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label={`Remover ${nome}`}
                      onClick={() => onLinhas(ls => ls.filter(x => x.chave !== l.chave))}><Trash2Icon aria-hidden="true" /></Button>
                  </div>
                })}
                <Button type="button" variant="link" size="sm" className="self-start" aria-label={`Adicionar horário: ${nomeDoDia}`} onClick={() => adicionar(diaSemana)}><PlusIcon aria-hidden="true" />Adicionar horário</Button>
              </div>
            </fieldset>
          })}
        </div>

        <Botao type="button" variante="secundario" className="self-start" disabled={!segunda.length} onClick={copiarSegunda}><CopyIcon aria-hidden="true" />Marcar dias úteis com mesmo horário de segunda</Botao>
        <div className="flex flex-col gap-1 rounded-lg bg-muted/60 px-4 py-3 text-sm">
          <p>Disponibilidade informada: <strong>{formatarTempo(disponibilidade)}</strong>. Meta: <strong>{formatarTempo(metaEmMinutos)}</strong>.</p>
          {falta > 0 && <p className="text-xs text-muted-foreground">Faltam {formatarTempo(falta)} para comportar a meta semanal.</p>}
        </div>
        {excesso && <Aviso tipo="atencao">{excesso}</Aviso>}
        <Botao type="submit" carregando={salvando} className="self-end">{salvando ? 'Gerando e salvando...' : 'Gerar e salvar cronograma'}</Botao>
      </fieldset>
    </form>
  )
}

export default EditorDeDisponibilidade
