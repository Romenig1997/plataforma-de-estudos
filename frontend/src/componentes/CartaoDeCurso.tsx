import type { ReactNode } from 'react'
import { urlDoBanner } from '../editais'
import { usePopover } from './usePopover'

export type OpcaoDoMenu = { rotulo: string; onSelecionar: () => void; perigo?: boolean; desabilitada?: boolean }

type DadosDaCapa = { editalId: number; titulo: string; sigla: string; bannerVersao: number | null }

const CORES = ['curso-capa--azul', 'curso-capa--violeta', 'curso-capa--petroleo']

/** Menu "Mais opções" do card: fecha com Esc e ao clicar fora. */
function MenuDoCurso({ titulo, opcoes }: { titulo: string; opcoes: OpcaoDoMenu[] }) {
  const { aberto, setAberto, container } = usePopover()
  return <div className="curso-menu" ref={container}>
    <button type="button" className="curso-menu__gatilho" aria-label={`Mais opções de ${titulo}`} aria-haspopup="menu" aria-expanded={aberto}
      onClick={() => setAberto(valor => !valor)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></svg>
    </button>
    {aberto && <div className="curso-menu__opcoes" role="menu">
      {opcoes.map(opcao => <button key={opcao.rotulo} type="button" role="menuitem" disabled={opcao.desabilitada}
        className={opcao.perigo ? 'curso-menu__opcao curso-menu__opcao--perigo' : 'curso-menu__opcao'}
        onClick={() => { setAberto(false); opcao.onSelecionar() }}>{opcao.rotulo}</button>)}
    </div>}
  </div>
}

/**
 * Capa do card: banner enviado pelo admin (ou a cor do curso) com o nome do
 * curso por cima. A sombra embaixo mantem o nome legivel em qualquer imagem.
 */
export function CapaDoCurso({ editalId, titulo, sigla, bannerVersao, menu }: DadosDaCapa & { menu?: OpcaoDoMenu[] }) {
  return <div className={`curso-capa ${CORES[editalId % CORES.length]}${bannerVersao ? ' curso-capa--banner' : ''}`}>
    {bannerVersao && <img className="curso-capa__imagem" src={urlDoBanner(editalId, bannerVersao)} alt="" loading="lazy" />}
    {sigla && <span className="curso-capa__sigla">{sigla}</span>}
    <h3 className="curso-capa__titulo">{titulo}</h3>
    {menu && menu.length > 0 && <MenuDoCurso titulo={titulo} opcoes={menu} />}
  </div>
}

type Props = DadosDaCapa & {
  orgao: string
  ano: number
  /** Curso em foco: card largo, no topo da pagina. */
  destaque?: boolean
  selo?: ReactNode
  menu?: OpcaoDoMenu[]
  children: ReactNode
}

/** Card de curso reutilizado em Meus cursos (inscritos, em foco e vitrine). */
function CartaoDeCurso({ orgao, ano, destaque = false, selo, menu, children, ...capa }: Props) {
  return <article className={`curso-cartao${destaque ? ' curso-cartao--destaque' : ''}`} aria-label={capa.titulo}>
    <CapaDoCurso {...capa} menu={menu} />
    <div className="curso-cartao__corpo">
      <p className="curso-cartao__meta">{selo}<span>{orgao} · {ano}</span></p>
      {children}
    </div>
  </article>
}

/** Barra de progresso do card, em topicos concluidos. */
export function ProgressoDoCurso({ titulo, concluidos, total, progresso }: { titulo: string; concluidos: number; total: number; progresso: number }) {
  const texto = progresso.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return <div className="curso-cartao__progresso">
    <progress value={progresso} max="100" aria-label={`Progresso em ${titulo}: ${texto}%`} />
    <div><span>{concluidos ? `${concluidos} de ${total} tópicos concluídos` : 'Ainda não começou'}</span><strong>{texto}%</strong></div>
  </div>
}

export default CartaoDeCurso
