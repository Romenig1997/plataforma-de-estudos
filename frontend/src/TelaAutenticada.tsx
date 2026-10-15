import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mensagemDaFalha } from './api'
import { listarEditaisAprovados, type EditalAprovado } from './editais'
import { buscarPlano, type Plano } from './planner'
import { buscarDashboard } from './dashboard'
import { buscarSessaoAtual, SessaoEncerrada, type Usuario } from './sessao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'

type Props = { token: string; onEncerrarSessao: (motivo?: string) => void }

function CapaDoCurso({ titulo, indice }: { titulo: string; indice: number }) {
  const temas = ['curso-card__capa--azul', 'curso-card__capa--violeta', 'curso-card__capa--petroleo']
  return <div className={`curso-card__capa ${temas[indice % temas.length]}`} role="img" aria-label={`Capa do curso ${titulo}`}>
    <svg viewBox="0 0 360 180" aria-hidden="true"><circle cx="294" cy="28" r="62" /><path d="M-8 157C84 90 157 204 246 126c42-37 76-42 122-15v69H-8z" /><path d="M225 53l14 14 31-35" /></svg>
    <span>CONCURSOS</span>
  </div>
}

function percentualDoCurso(edital: EditalAprovado, progressoPorEdital: Record<number, number>): number {
  return progressoPorEdital[edital.id] ?? 0
}

export default function TelaAutenticada({ token, onEncerrarSessao }: Props) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [editais, setEditais] = useState<EditalAprovado[]>([])
  const [plano, setPlano] = useState<Plano | null>(null)
  const [progressoPorEdital, setProgressoPorEdital] = useState<Record<number, number>>({})
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [parametros] = useSearchParams()
  const busca = parametros.get('buscar')?.trim().toLocaleLowerCase('pt-BR') ?? ''
  // O curso do plano ativo vem primeiro: e por onde o aluno continua.
  const editaisVisiveis = editais
    .filter(edital => !busca || `${edital.titulo} ${edital.orgao} ${edital.ano}`.toLocaleLowerCase('pt-BR').includes(busca))
    .sort((a, b) => Number(b.id === plano?.edital.id) - Number(a.id === plano?.edital.id))

  useEffect(() => {
    let descartado = false
    Promise.all([buscarSessaoAtual(token), listarEditaisAprovados(token), buscarPlano(token)])
      .then(async ([dados, catalogo, planoSalvo]) => {
        let progresso: Record<number, number> = {}
        if (planoSalvo) {
          try {
            const painel = await buscarDashboard(token)
            if (painel) progresso = { [painel.editalId]: painel.progresso }
          } catch (falha: unknown) {
            if (falha instanceof SessaoEncerrada) throw falha
            // Um cartão continua utilizável quando somente a leitura do painel falha.
          }
        }
        if (descartado) return
        setUsuario(dados)
        setEditais(catalogo)
        setPlano(planoSalvo)
        setProgressoPorEdital(progresso)
      })
      .catch((falha: unknown) => {
        if (descartado) return
        setErro(mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível carregar os seus cursos. Tente novamente.'))
      })
      .finally(() => { if (!descartado) setCarregando(false) })
    return () => { descartado = true }
  }, [token, onEncerrarSessao, tentativa])

  const tentarNovamente = useCallback(() => {
    setErro(null)
    setCarregando(true)
    setTentativa(numero => numero + 1)
  }, [])

  return <main className="tela tela-cursos">
    <header className="cursos-cabecalho">
      <div><span className="sobretitulo">MINHA PREPARAÇÃO</span><h1>Meus cursos</h1><p>{usuario ? `Olá, ${usuario.nome.split(' ')[0]}. Escolha um curso para continuar seus estudos.` : 'Escolha um curso para continuar seus estudos.'}</p></div>
      <div className="cursos-cabecalho__acoes">
        {usuario?.perfil === 'ADMIN' && <Link className="cursos-cabecalho__acao cursos-cabecalho__acao--texto" to="/admin">Área administrativa</Link>}
        <Link className="cursos-cabecalho__acao" to="/planner">{plano ? 'Ajustar meu plano' : 'Escolher um curso para o plano'} <span aria-hidden="true">+</span></Link>
      </div>
    </header>
    {erro && <Aviso tipo="erro">{erro}</Aviso>}
    {carregando && <EstadoCarregando>Carregando seus cursos...</EstadoCarregando>}
    {!carregando && erro && <Botao type="button" variante="secundario" onClick={tentarNovamente}>Tentar novamente</Botao>}
    {!carregando && !erro && editais.length === 0 && <section className="cursos-vazio"><h2>Seu espaço de estudos está pronto</h2><p>Quando um edital for disponibilizado, ele aparecerá aqui para você criar seu plano de estudos.</p>{usuario?.perfil === 'ADMIN' && <Link to="/admin/editais">Gerenciar editais</Link>}</section>}
    {!carregando && !erro && editais.length > 0 && editaisVisiveis.length === 0 && <section className="cursos-vazio"><h2>Nenhum curso encontrado</h2><p>Não encontramos cursos para “{parametros.get('buscar')}”. Tente outro termo de busca.</p><Link to="/app">Limpar pesquisa</Link></section>}
    {!carregando && !erro && editaisVisiveis.length > 0 && <section className="cursos-grade" aria-label="Cursos disponíveis">
      {editaisVisiveis.map((edital, indice) => {
        const progresso = percentualDoCurso(edital, progressoPorEdital)
        const planoAtivo = plano?.edital.id === edital.id
        return <article className="curso-card" key={edital.id}>
          <CapaDoCurso titulo={edital.titulo} indice={indice} />
          <div className="curso-card__corpo">
            <div className="curso-card__meta"><span>{edital.orgao}</span><span>{edital.ano}</span></div>
            <h2>{edital.titulo}</h2>
            <p>{planoAtivo ? <span className="selo">Plano de estudos ativo</span> : `${edital.disciplinas.length} disciplinas disponíveis`}</p>
            {planoAtivo
              ? <div className="curso-card__progresso"><div><span>Progresso</span><strong>{progresso}%</strong></div><progress value={progresso} max="100" aria-label={`Progresso em ${edital.titulo}: ${progresso}%`} /></div>
              : <p className="curso-card__dica">Ative no Planner para registrar seu progresso.</p>}
            <Link className="curso-card__acessar" to={`/curso/${edital.id}`} aria-label={`${planoAtivo ? 'Continuar' : 'Acessar'} ${edital.titulo}`}>{planoAtivo ? 'Continuar' : 'Acessar'} <span aria-hidden="true">→</span></Link>
          </div>
        </article>
      })}
    </section>}
  </main>
}
