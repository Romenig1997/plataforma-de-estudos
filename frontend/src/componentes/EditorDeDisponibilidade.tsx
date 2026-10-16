import { DIAS, minutosDisponiveis, type Disponibilidade, type LinhaDeHorario } from '../cronograma'
import { formatarTempo } from '../planner'
import Aviso from './Aviso'
import Botao from './Botao'
import CampoFormulario from './CampoFormulario'

type Props = {
  semana: string
  linhas: LinhaDeHorario[]
  metaEmMinutos: number
  erros: Record<string, string>
  erro: string | null
  salvando: boolean
  onSemana: (semana: string) => void
  onLinhas: (atualizar: (linhas: LinhaDeHorario[]) => LinhaDeHorario[]) => void
  onSalvar: () => void
}

/** Formulario de dias e horarios livres que gera a agenda combinada. */
function EditorDeDisponibilidade({ semana, linhas, metaEmMinutos, erros, erro, salvando, onSemana, onLinhas, onSalvar }: Props) {
  const disponibilidade = minutosDisponiveis(linhas)
  const falta = metaEmMinutos - disponibilidade
  const editar = (chave: number, campo: keyof Disponibilidade, valor: string | number) =>
    onLinhas(ls => ls.map(l => (l.chave === chave ? { ...l, [campo]: valor } : l)))

  return (
    <form onSubmit={e => { e.preventDefault(); onSalvar() }} noValidate>
      <fieldset className="planner-campos" disabled={salvando}>
        <legend className="visualmente-oculto">Disponibilidade de estudo</legend>
        <p className="painel__nota">Sessões de até 60 minutos, sem sobreposição, no seu horário local.</p>
        <CampoFormulario id="cronograma-semana" rotulo="Semana iniciando em" erro={erros.semanaInicio} ajuda="Selecione a segunda-feira da semana que deseja planejar.">
          <input type="date" value={semana} onChange={e => onSemana(e.target.value)} />
        </CampoFormulario>
        <h3>Dias e horários disponíveis</h3>
        {linhas.map((l, i) => <fieldset className="cronograma-periodo" key={l.chave}>
          <legend>Horário {i + 1}</legend>
          <CampoFormulario id={`dia-${l.chave}`} rotulo={`Dia da semana — horário ${i + 1}`}><select value={l.diaSemana} onChange={e => editar(l.chave, 'diaSemana', Number(e.target.value))}>
            {DIAS.map((d, indice) => <option key={d} value={indice + 1}>{d}</option>)}
          </select></CampoFormulario>
          <div className="cronograma-horas">
            <CampoFormulario id={`inicio-${l.chave}`} rotulo={`Início — horário ${i + 1}`} erro={erros[`inicio-${l.chave}`]}><input type="time" value={l.inicio} onChange={e => editar(l.chave, 'inicio', e.target.value)} /></CampoFormulario>
            <CampoFormulario id={`fim-${l.chave}`} rotulo={`Fim — horário ${i + 1}`} erro={erros[`fim-${l.chave}`]}><input type="time" value={l.fim} onChange={e => editar(l.chave, 'fim', e.target.value)} /></CampoFormulario>
          </div>
          <Botao type="button" variante="secundario" onClick={() => onLinhas(ls => ls.filter(x => x.chave !== l.chave))}>Remover horário {i + 1}</Botao>
        </fieldset>)}
        <Botao type="button" variante="secundario" onClick={() => onLinhas(ls => [...ls, { chave: Math.max(0, ...ls.map(l => l.chave)) + 1, diaSemana: 1, inicio: '', fim: '' }])}>Adicionar horário</Botao>
        <p>Disponibilidade informada: <strong>{formatarTempo(disponibilidade)}</strong>. Meta: <strong>{formatarTempo(metaEmMinutos)}</strong>.</p>
        {falta > 0 && <p className="campo__ajuda">Faltam {formatarTempo(falta)} para comportar a meta semanal.</p>}
        {erros.disponibilidades && <Aviso tipo="erro">{erros.disponibilidades}</Aviso>}
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" carregando={salvando}>{salvando ? 'Gerando e salvando...' : 'Gerar e salvar cronograma'}</Botao>
      </fieldset>
    </form>
  )
}

export default EditorDeDisponibilidade
