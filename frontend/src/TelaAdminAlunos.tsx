import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { alterarPerfil, dataCurta, listarUsuarios, type UsuarioAdmin } from './admin'
import { mensagemDaFalha } from './api'
import { buscarSessaoAtual, type PerfilDeAcesso } from './sessao'
import { useRecurso } from './useRecurso'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import EstadoVazio from './componentes/EstadoVazio'
import Notificacao, { type DadosDaNotificacao } from './componentes/Notificacao'
import Tabela from './componentes/Tabela'
import { CabecalhoDaPagina } from './componentes/Pagina'

type Props = {
  token: string
  onEncerrarSessao: (motivo?: string) => void
}

type Dados = { usuarios: UsuarioAdmin[]; meuId: number }
type FiltroDePerfil = 'todos' | PerfilDeAcesso
type FiltroDeSituacao = 'todas' | 'confirmado' | 'pendente'

const NOME_DO_PERFIL: Record<PerfilDeAcesso, string> = { ALUNO: 'Aluno', ADMIN: 'Administrador' }

/**
 * Gestao de alunos: lista as contas, filtra por nome, e-mail, perfil e
 * confirmacao de e-mail, e troca o perfil de acesso de outra conta.
 *
 * <p>A troca pede confirmacao na propria linha, porque derruba a sessao da
 * conta alterada (o perfil antigo estava no token dela). A propria conta nao
 * tem o seletor: o backend tambem recusa essa troca.
 */
export default function TelaAdminAlunos({ token, onEncerrarSessao }: Props) {
  const carregar = useCallback(async (): Promise<Dados> => {
    const [usuarios, eu] = await Promise.all([listarUsuarios(token), buscarSessaoAtual(token)])
    return { usuarios, meuId: eu.id }
  }, [token])
  const { dados, definirDados, carregando, erro, recarregar } = useRecurso(carregar, onEncerrarSessao, 'Não foi possível carregar a lista de alunos. Tente novamente.')
  const [parametros, setParametros] = useSearchParams()
  const [notificacao, setNotificacao] = useState<DadosDaNotificacao | null>(null)
  const [pendente, setPendente] = useState<{ usuario: UsuarioAdmin; perfil: PerfilDeAcesso } | null>(null)
  const [salvando, setSalvando] = useState(false)

  const termo = parametros.get('buscar') ?? ''
  const filtroPerfil = (parametros.get('perfil') as FiltroDePerfil | null) ?? 'todos'
  const filtroSituacao = (parametros.get('situacao') as FiltroDeSituacao | null) ?? 'todas'

  /** Filtros ficam no endereco: a busca do topo e os links da visao geral caem aqui ja filtrados. */
  function filtrar(chave: string, valor: string, padrao: string) {
    setParametros(atuais => {
      const novos = new URLSearchParams(atuais)
      if (valor && valor !== padrao) novos.set(chave, valor)
      else novos.delete(chave)
      return novos
    }, { replace: true })
  }

  const busca = termo.trim().toLocaleLowerCase('pt-BR')
  const visiveis = (dados?.usuarios ?? []).filter(usuario =>
    (!busca || `${usuario.nome} ${usuario.email}`.toLocaleLowerCase('pt-BR').includes(busca))
    && (filtroPerfil === 'todos' || usuario.perfil === filtroPerfil)
    && (filtroSituacao === 'todas' || (filtroSituacao === 'confirmado') === Boolean(usuario.emailVerificado)))

  async function confirmarTroca() {
    if (!pendente || !dados) return
    setSalvando(true)
    setNotificacao(null)
    try {
      const atualizado = await alterarPerfil(token, pendente.usuario.id, pendente.perfil)
      definirDados({ ...dados, usuarios: dados.usuarios.map(usuario => (usuario.id === atualizado.id ? atualizado : usuario)) })
      setNotificacao({ tipo: 'sucesso', mensagem: `${atualizado.nome} agora é ${NOME_DO_PERFIL[atualizado.perfil].toLocaleLowerCase('pt-BR')}. A conta precisa entrar de novo.` })
      setPendente(null)
    } catch (falha: unknown) {
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível alterar o perfil.')
      if (mensagem) setNotificacao({ tipo: 'erro', mensagem })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <main className="tela tela-pagina tela-admin">
      <CabecalhoDaPagina sobretitulo="PAINEL DE GESTÃO" titulo="Gestão de alunos" descricao="Contas cadastradas, confirmação de e-mail e perfil de acesso." />

      {notificacao && <Notificacao {...notificacao} onFechar={() => setNotificacao(null)} />}
      {erro && <><Aviso tipo="erro">{erro}</Aviso><Botao type="button" variante="secundario" onClick={recarregar}>Tentar novamente</Botao></>}
      {carregando && !dados && <EstadoCarregando>Carregando alunos...</EstadoCarregando>}

      {dados && <section className="painel" aria-labelledby="titulo-contas">
        <h2 id="titulo-contas" className="visualmente-oculto">Contas cadastradas</h2>
        <div className="admin-filtros">
          <label className="admin-filtros__busca">
            <span>Buscar</span>
            <input type="search" value={termo} placeholder="Nome ou e-mail" onChange={evento => filtrar('buscar', evento.target.value, '')} />
          </label>
          <label>
            <span>Perfil</span>
            <select value={filtroPerfil} onChange={evento => filtrar('perfil', evento.target.value, 'todos')}>
              <option value="todos">Todos os perfis</option>
              <option value="ALUNO">Aluno</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <label>
            <span>E-mail</span>
            <select value={filtroSituacao} onChange={evento => filtrar('situacao', evento.target.value, 'todas')}>
              <option value="todas">Todas as situações</option>
              <option value="confirmado">Confirmado</option>
              <option value="pendente">Não confirmado</option>
            </select>
          </label>
        </div>
        <p className="admin-filtros__total" role="status">{visiveis.length === dados.usuarios.length ? `${dados.usuarios.length} contas` : `${visiveis.length} de ${dados.usuarios.length} contas`}</p>

        {!dados.usuarios.length && <EstadoVazio>Nenhum usuário cadastrado.</EstadoVazio>}
        {dados.usuarios.length > 0 && !visiveis.length && <EstadoVazio>Nenhuma conta corresponde aos filtros.</EstadoVazio>}

        {visiveis.length > 0 && <Tabela>
          <thead>
            <tr><th scope="col">Nome</th><th scope="col">E-mail</th><th scope="col">Cadastro</th><th scope="col">Confirmação</th><th scope="col">Perfil</th></tr>
          </thead>
          <tbody>
            {visiveis.map(usuario => {
              const souEu = usuario.id === dados.meuId
              const confirmando = pendente?.usuario.id === usuario.id
              return <tr key={usuario.id}>
                <td>{usuario.nome}</td>
                <td>{usuario.email}</td>
                <td>{usuario.criadoEm ? dataCurta(usuario.criadoEm) : <span title="Conta criada antes de a plataforma registrar a data de cadastro">Sem data</span>}</td>
                <td><span className={`selo ${usuario.emailVerificado ? 'selo--sucesso' : 'selo--alerta'}`}>{usuario.emailVerificado ? 'Confirmado' : 'Pendente'}</span></td>
                <td>
                  {souEu
                    ? <span className="selo">{NOME_DO_PERFIL[usuario.perfil]} (você)</span>
                    : confirmando && pendente
                      ? <div className="admin-confirmacao" role="group" aria-label={`Confirmar troca de perfil de ${usuario.nome}`}>
                        <p>Tornar {usuario.nome} {NOME_DO_PERFIL[pendente.perfil].toLocaleLowerCase('pt-BR')}? A conta precisará entrar de novo.</p>
                        <div>
                          <button type="button" className="botao-link" disabled={salvando} onClick={() => void confirmarTroca()}>{salvando ? 'Salvando...' : 'Confirmar'}</button>
                          <button type="button" className="botao-link botao-link--secundario" disabled={salvando} onClick={() => setPendente(null)}>Cancelar</button>
                        </div>
                      </div>
                      : <select aria-label={`Perfil de ${usuario.nome}`} value={usuario.perfil} disabled={pendente !== null}
                        onChange={evento => setPendente({ usuario, perfil: evento.target.value as PerfilDeAcesso })}>
                        <option value="ALUNO">Aluno</option>
                        <option value="ADMIN">Administrador</option>
                      </select>}
                </td>
              </tr>
            })}
          </tbody>
        </Tabela>}
      </section>}
    </main>
  )
}
