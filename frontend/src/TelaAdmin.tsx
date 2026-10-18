import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { buscarResumo, dataCurta, type ResumoAdmin } from './admin'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import Tabela from './componentes/Tabela'
import { CabecalhoDaPagina, Conteudo, EstadoSemDados, Indicador, Painel } from './componentes/Pagina'
import { BookOpenIcon, CheckIcon, FileCheck2Icon, FileUpIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  token: string
  /** Encerra a sessao quando o token expira no meio do uso da tela. */
  onEncerrarSessao: (motivo?: string) => void
}

const numero = (valor: number) => valor.toLocaleString('pt-BR')
const LINK = 'font-medium text-primary hover:underline'

/**
 * Visao geral do painel de gestao: indicadores da plataforma, pendencias que
 * pedem acao do admin e os numeros de cada curso publicado.
 *
 * <p>A rota ja e restrita a ADMIN no App; se alguem forcar a entrada, o 403
 * do backend chega aqui como mensagem, sem encerrar a sessao.
 */
function TelaAdmin({ token, onEncerrarSessao }: Props) {
  const carregar = useCallback(() => buscarResumo(token), [token])
  const { dados: resumo, carregando, erro, recarregar } = useRecurso<ResumoAdmin>(carregar, onEncerrarSessao, 'Não foi possível carregar a visão geral. Tente novamente.')

  const pendencias = resumo ? [
    { texto: 'Editais aguardando revisão', valor: resumo.editaisAguardandoRevisao, para: '/admin/editais', acao: 'Revisar editais' },
    { texto: 'Questões em rascunho', valor: resumo.questoesEmRascunho, para: '/admin/questoes', acao: 'Revisar questões' },
    { texto: 'Contas sem e-mail confirmado', valor: resumo.contasSemConfirmacao, para: '/admin/alunos?situacao=pendente', acao: 'Ver contas' },
  ] : []

  return (
    <Conteudo largura="larga">
      <CabecalhoDaPagina sobretitulo="PAINEL DE GESTÃO" titulo="Visão geral" descricao="Como a plataforma está hoje e o que pede a sua atenção."
        acoes={<Button asChild><Link to="/admin/editais"><FileUpIcon aria-hidden="true" />Importar edital</Link></Button>} />

      {erro && <div className="flex flex-col items-start gap-3"><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></div>}
      {carregando && !resumo && <EstadoCarregando formato="pagina">Carregando indicadores...</EstadoCarregando>}

      {resumo && <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores da plataforma" role="group">
          <Indicador rotulo="Total de alunos" icone={<UsersIcon />} valor={numero(resumo.totalAlunos)}
            detalhe={`${numero(resumo.totalAdministradores)} ${resumo.totalAdministradores === 1 ? 'administrador' : 'administradores'}`} />
          <Indicador rotulo="Novos alunos (30 dias)" icone={<UserPlusIcon />} valor={numero(resumo.novosAlunos30Dias)} detalhe={<Link className={LINK} to="/admin/alunos">Gerenciar alunos</Link>} />
          <Indicador rotulo="Cursos publicados" icone={<BookOpenIcon />} valor={numero(resumo.cursosPublicados)} detalhe={<Link className={LINK} to="/admin/cursos">Ver cursos</Link>} />
          <Indicador rotulo="Questões publicadas" icone={<FileCheck2Icon />} valor={numero(resumo.questoesPublicadas)} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Painel titulo="Pendências" id="titulo-pendencias">
            <ul className="flex flex-col divide-y">
              {pendencias.map(item => <li key={item.texto} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="min-w-0 flex-1 text-sm">{item.texto}</span>
                <strong className={cn('text-lg font-bold tabular-nums', item.valor > 0 ? 'text-warning' : 'text-muted-foreground')}>{numero(item.valor)}</strong>
                {item.valor > 0 ? <Button asChild variant="outline" size="sm"><Link to={item.para}>{item.acao}</Link></Button> : <Badge variant="success"><CheckIcon aria-hidden="true" />Em dia</Badge>}
              </li>)}
            </ul>
          </Painel>

          <Painel titulo="Cadastros recentes" id="titulo-cadastros-recentes" acao={<Button asChild variant="link" size="sm"><Link to="/admin/alunos">Ver todos</Link></Button>}>
            {!resumo.cadastrosRecentes.length
              ? <p className="text-sm text-muted-foreground">Os novos cadastros aparecem aqui assim que as contas forem criadas.</p>
              : <ul className="flex flex-col divide-y">
                {resumo.cadastrosRecentes.map(cadastro => <li key={cadastro.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground" aria-hidden="true">{cadastro.nome.trim().charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{cadastro.nome}</span>
                  <Badge variant={cadastro.perfil === 'ADMIN' ? 'warning' : 'secondary'}>{cadastro.perfil === 'ADMIN' ? 'Administrador' : 'Aluno'}</Badge>
                  <span className="text-xs text-muted-foreground tabular-nums">{dataCurta(cadastro.criadoEm)}</span>
                </li>)}
              </ul>}
          </Painel>

          <Painel className="xl:col-span-2" titulo="Cursos publicados" id="titulo-cursos-resumo" acao={<Button asChild variant="link" size="sm"><Link to="/admin/cursos">Gerenciar</Link></Button>}>
            {!resumo.cursos.length
              ? <EstadoSemDados titulo="Nenhum curso publicado" acao={{ texto: 'Importar edital', para: '/admin/editais' }}>Importe e aprove um edital para que ele vire um curso para os alunos.</EstadoSemDados>
              : <Tabela>
                <thead><tr><th scope="col">Curso</th><th scope="col">Inscritos</th><th scope="col">Questões</th><th scope="col">Rascunhos</th></tr></thead>
                <tbody>
                  {resumo.cursos.map(curso => <tr key={curso.editalId}>
                    <td className="min-w-48"><Link className={LINK} to={`/admin/cursos?curso=${curso.editalId}`}>{curso.titulo}</Link></td>
                    <td className="tabular-nums">{numero(curso.inscritos)}</td>
                    <td className="tabular-nums">{numero(curso.questoesPublicadas)}</td>
                    <td className="tabular-nums">{curso.questoesEmRascunho ? <Badge variant="warning">{numero(curso.questoesEmRascunho)}</Badge> : numero(curso.questoesEmRascunho)}</td>
                  </tr>)}
                </tbody>
              </Tabela>}
          </Painel>
        </div>
      </>}
    </Conteudo>
  )
}

export default TelaAdmin
