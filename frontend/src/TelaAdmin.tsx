import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { buscarResumo, dataCurta, type ResumoAdmin } from './admin'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import Tabela from './componentes/Tabela'
import { CabecalhoDaPagina, EstadoSemDados, Indicador, Painel } from './componentes/Pagina'

type Props = {
  token: string
  /** Encerra a sessao quando o token expira no meio do uso da tela. */
  onEncerrarSessao: (motivo?: string) => void
}

const numero = (valor: number) => valor.toLocaleString('pt-BR')

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
    <main className="tela tela-pagina tela-admin">
      <CabecalhoDaPagina sobretitulo="PAINEL DE GESTÃO" titulo="Visão geral" descricao="Como a plataforma está hoje e o que pede a sua atenção."
        acoes={<Link className="botao-link" to="/admin/editais">Importar edital</Link>} />

      {erro && <><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></>}
      {carregando && !resumo && <EstadoCarregando>Carregando indicadores...</EstadoCarregando>}

      {resumo && <>
        <div className="indicadores" aria-label="Indicadores da plataforma" role="group">
          <Indicador rotulo="Total de alunos" valor={numero(resumo.totalAlunos)}
            detalhe={`${numero(resumo.totalAdministradores)} ${resumo.totalAdministradores === 1 ? 'administrador' : 'administradores'}`} />
          <Indicador rotulo="Novos alunos (30 dias)" valor={numero(resumo.novosAlunos30Dias)} detalhe={<Link to="/admin/alunos">Gerenciar alunos</Link>} />
          <Indicador rotulo="Cursos publicados" valor={numero(resumo.cursosPublicados)} detalhe={<Link to="/admin/cursos">Ver cursos</Link>} />
          <Indicador rotulo="Questões publicadas" valor={numero(resumo.questoesPublicadas)} />
        </div>

        <div className="paineis">
          <Painel titulo="Pendências" id="titulo-pendencias">
            <ul className="admin-pendencias">
              {pendencias.map(item => <li key={item.texto}>
                <span>{item.texto}</span>
                <strong>{numero(item.valor)}</strong>
                {item.valor > 0 ? <Link to={item.para}>{item.acao}</Link> : <span className="admin-pendencias__ok">Em dia</span>}
              </li>)}
            </ul>
          </Painel>

          <Painel titulo="Cadastros recentes" id="titulo-cadastros-recentes" acao={<Link to="/admin/alunos">Ver todos</Link>}>
            {!resumo.cadastrosRecentes.length
              ? <p className="painel__nota">Os novos cadastros aparecem aqui assim que as contas forem criadas.</p>
              : <ul className="admin-pendencias">
                {resumo.cadastrosRecentes.map(cadastro => <li key={cadastro.id}>
                  <span>{cadastro.nome}</span>
                  <span className="selo">{cadastro.perfil === 'ADMIN' ? 'Administrador' : 'Aluno'}</span>
                  <span className="admin-pendencias__data">{dataCurta(cadastro.criadoEm)}</span>
                </li>)}
              </ul>}
          </Painel>

          <Painel titulo="Cursos publicados" id="titulo-cursos-resumo" acao={<Link to="/admin/cursos">Gerenciar</Link>}>
            {!resumo.cursos.length
              ? <EstadoSemDados titulo="Nenhum curso publicado" acao={{ texto: 'Importar edital', para: '/admin/editais' }}>Importe e aprove um edital para que ele vire um curso para os alunos.</EstadoSemDados>
              : <Tabela>
                <thead><tr><th scope="col">Curso</th><th scope="col">Inscritos</th><th scope="col">Questões</th><th scope="col">Rascunhos</th></tr></thead>
                <tbody>
                  {resumo.cursos.map(curso => <tr key={curso.editalId}>
                    <td><Link to={`/admin/cursos?curso=${curso.editalId}`}>{curso.titulo}</Link></td>
                    <td>{numero(curso.inscritos)}</td>
                    <td>{numero(curso.questoesPublicadas)}</td>
                    <td>{numero(curso.questoesEmRascunho)}</td>
                  </tr>)}
                </tbody>
              </Tabela>}
          </Painel>
        </div>
      </>}
    </main>
  )
}

export default TelaAdmin
