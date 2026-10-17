import { DIAS, avisoDeHorasAcimaDaMeta, minutosDisponiveis, type Disponibilidade, type LinhaDeHorario } from '../cronograma'
import { formatarTempo } from '../planner'
import Aviso from './Aviso'
import Botao from './Botao'
import CampoFormulario from './CampoFormulario'

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
      <fieldset className="planner-campos" disabled={salvando}>
        <legend className="visualmente-oculto">Disponibilidade de estudo</legend>
        <p className="painel__nota">Estes horários valem para todas as semanas: a agenda se renova sozinha a cada segunda-feira, começando pelos conteúdos que você ainda não concluiu. Sessões de até 60 minutos, no seu horário local.</p>
        {erros.semanaInicio && <Aviso tipo="erro">{erros.semanaInicio}</Aviso>}

        <div className="grade-horarios">
          {DIAS.map((nomeDoDia, i) => {
            const diaSemana = i + 1
            const doDia = linhas.filter(l => l.diaSemana === diaSemana)
            return <fieldset key={nomeDoDia} className="grade-horarios__dia">
              <legend>{nomeDoDia}</legend>
              {!doDia.length && <p className="grade-horarios__vazio">Sem estudo</p>}
              {doDia.map((l, n) => {
                const nome = `${nomeDoDia}, horário ${n + 1}`
                return <div key={l.chave} className="grade-horarios__intervalo">
                  <CampoFormulario id={`inicio-${l.chave}`} rotulo="Início" erro={erros[`inicio-${l.chave}`]}>
                    <input type="time" aria-label={`Início — ${nome}`} value={l.inicio} onChange={e => editar(l.chave, 'inicio', e.target.value)} />
                  </CampoFormulario>
                  <CampoFormulario id={`fim-${l.chave}`} rotulo="Fim" erro={erros[`fim-${l.chave}`]}>
                    <input type="time" aria-label={`Fim — ${nome}`} value={l.fim} onChange={e => editar(l.chave, 'fim', e.target.value)} />
                  </CampoFormulario>
                  <button type="button" className="curso-link grade-horarios__remover" aria-label={`Remover ${nome}`}
                    onClick={() => onLinhas(ls => ls.filter(x => x.chave !== l.chave))}>Remover</button>
                </div>
              })}
              <button type="button" className="curso-link" aria-label={`Adicionar horário: ${nomeDoDia}`} onClick={() => adicionar(diaSemana)}>+ Adicionar horário</button>
            </fieldset>
          })}
        </div>

        <div className="acoes acoes--em-linha">
          <Botao type="button" variante="secundario" disabled={!segunda.length} onClick={copiarSegunda}>Marcar dias úteis com mesmo horário de segunda</Botao>
        </div>
        <p>Disponibilidade informada: <strong>{formatarTempo(disponibilidade)}</strong>. Meta: <strong>{formatarTempo(metaEmMinutos)}</strong>.</p>
        {falta > 0 && <p className="campo__ajuda">Faltam {formatarTempo(falta)} para comportar a meta semanal.</p>}
        {excesso && <Aviso tipo="atencao">{excesso}</Aviso>}
        <Botao type="submit" carregando={salvando}>{salvando ? 'Gerando e salvando...' : 'Gerar e salvar cronograma'}</Botao>
      </fieldset>
    </form>
  )
}

export default EditorDeDisponibilidade
