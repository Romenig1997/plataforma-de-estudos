import { useCallback, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { buscarResumo, type CursoNoResumo } from './admin'
import { listarEditaisAprovados, type EditalAprovado } from './editais'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EditorDeCapaDoCurso from './componentes/EditorDeCapaDoCurso'
import EditorDeEstruturaDoCurso from './componentes/EditorDeEstruturaDoCurso'
import EstadoCarregando from './componentes/EstadoCarregando'
import Notificacao, { type DadosDaNotificacao } from './componentes/Notificacao'
import { CabecalhoDaPagina, Conteudo, EstadoSemDados, Indicador, Painel } from './componentes/Pagina'
import { BookOpenIcon, EyeIcon, FileCheck2Icon, FileUpIcon, LayersIcon, TriangleAlertIcon, UsersIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NativeSelect } from '@/components/ui/native-select'

type Props = {
  token: string
  onEncerrarSessao: (motivo?: string) => void
}

type Dados = { cursos: EditalAprovado[]; numeros: CursoNoResumo[] }

const numero = (valor: number) => valor.toLocaleString('pt-BR')
/** Topicos de estudo: assuntos sem subassuntos ou os proprios subassuntos (mesma regra do aluno). */
const topicosDe = (curso: EditalAprovado) =>
  curso.disciplinas.reduce((soma, d) => soma + d.assuntos.reduce((s, a) => s + Math.max(1, a.subassuntos.length), 0), 0)

/**
 * Cursos e aulas: o admin escolhe um curso publicado e ve inscritos, numeros
 * de questoes, edita a estrutura de disciplinas e topicos (as aulas que o
 * aluno marca) e a capa do card.
 */
export default function TelaAdminCursos({ token, onEncerrarSessao }: Props) {
  const carregar = useCallback(async (): Promise<Dados> => {
    const [cursos, resumo] = await Promise.all([listarEditaisAprovados(token), buscarResumo(token)])
    return { cursos, numeros: resumo.cursos }
  }, [token])
  const { dados, definirDados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar os cursos. Tente novamente.')
  const [parametros, setParametros] = useSearchParams()
  const [notificacao, setNotificacao] = useState<DadosDaNotificacao | null>(null)

  const cursos = dados?.cursos ?? []
  const escolhido = Number(parametros.get('curso'))
  const curso = cursos.find(item => item.id === escolhido) ?? cursos[0] ?? null
  const numeros = dados?.numeros.find(item => item.editalId === curso?.id)

  function escolher(id: string) {
    setNotificacao(null)
    setParametros({ curso: id }, { replace: true })
  }

  return (
    <Conteudo largura="larga">
      <CabecalhoDaPagina sobretitulo="PAINEL DE GESTÃO" titulo="Cursos e aulas" descricao="Cursos publicados, suas disciplinas, tópicos e materiais."
        acoes={<>
          <Button asChild><Link to="/admin/editais"><FileUpIcon aria-hidden="true" />Importar edital</Link></Button>
          <Button asChild variant="outline"><Link to="/admin/questoes">Revisar questões</Link></Button>
        </>} />

      {notificacao && <Notificacao {...notificacao} onFechar={() => setNotificacao(null)} />}
      {erro && <div className="flex flex-col items-start gap-3"><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></div>}
      {carregando && !dados && <EstadoCarregando formato="pagina">Carregando cursos...</EstadoCarregando>}

      {dados && !curso && <EstadoSemDados titulo="Nenhum curso publicado" icone={<BookOpenIcon />} acao={{ texto: 'Importar edital', para: '/admin/editais' }}>
        Importe o PDF de um edital, revise a estrutura e aprove para que ele vire um curso.
      </EstadoSemDados>}

      {dados && curso && <>
        <label className="flex w-full flex-col gap-2 text-sm font-medium sm:max-w-md">
          <span>Curso</span>
          <NativeSelect value={curso.id} onChange={evento => escolher(evento.target.value)}>
            {cursos.map(item => <option key={item.id} value={item.id}>{item.titulo}</option>)}
          </NativeSelect>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="group" aria-label={`Números de ${curso.titulo}`}>
          <Indicador rotulo="Inscritos" icone={<UsersIcon />} valor={numero(numeros?.inscritos ?? 0)} />
          <Indicador rotulo="Disciplinas" icone={<LayersIcon />} valor={numero(curso.disciplinas.length)} detalhe={`${numero(topicosDe(curso))} tópicos`} />
          <Indicador rotulo="Questões publicadas" icone={<FileCheck2Icon />} valor={numero(numeros?.questoesPublicadas ?? 0)}
            detalhe={numeros?.questoesEmRascunho ? <Link className="font-medium text-primary hover:underline" to="/admin/questoes">{numero(numeros.questoesEmRascunho)} em rascunho</Link> : 'Nenhum rascunho'} />
        </div>

        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Painel titulo="Estrutura do curso" id="titulo-estrutura" acao={<Button asChild variant="link" size="sm"><Link to={`/curso/${curso.id}`}><EyeIcon aria-hidden="true" />Ver como aluno</Link></Button>}>
            <p className="flex gap-2 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning"><TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Excluir uma disciplina ou um tópico também apaga o progresso dos alunos, as questões e as atividades do cronograma ligadas a ele. Os inscritos verão o cronograma como desatualizado.</p>
            <EditorDeEstruturaDoCurso token={token} curso={curso} onEncerrarSessao={onEncerrarSessao}
              onNotificar={(tipo, mensagem) => setNotificacao({ tipo, mensagem })}
              onAtualizado={atualizado => definirDados({ ...dados, cursos: cursos.map(item => (item.id === atualizado.id ? atualizado : item)) })} />
          </Painel>

          <div className="flex flex-col gap-6">
            <Painel titulo="Capa e órgão" id="titulo-capa">
              <EditorDeCapaDoCurso key={curso.id} token={token} curso={curso} onEncerrarSessao={onEncerrarSessao}
                onNotificar={(tipo, mensagem) => setNotificacao({ tipo, mensagem })}
                onAtualizado={mudancas => definirDados({ ...dados, cursos: cursos.map(item => (item.id === curso.id ? { ...item, ...mudancas } : item)) })} />
            </Painel>
            <Painel titulo="Material" id="titulo-material">
              <p className="text-sm text-muted-foreground">{curso.possuiPdfOriginal || curso.materialPdfUrl
                ? 'O PDF do edital está disponível para os alunos nas aulas do curso.'
                : 'Este curso não tem PDF do edital ligado.'}</p>
              <p className="text-sm text-muted-foreground">{curso.orgao} · {curso.ano}</p>
            </Painel>
          </div>
        </div>
      </>}
    </Conteudo>
  )
}
