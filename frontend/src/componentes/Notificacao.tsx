import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'

export type DadosDaNotificacao = { tipo: 'sucesso' | 'erro'; mensagem: string }

type Props = {
  tipo: DadosDaNotificacao['tipo']
  /** Texto ou conteudo com link (ex.: "Atualize o cronograma"). */
  mensagem: ReactNode
  onFechar: () => void
  /** Tempo ate fechar sozinha; sucesso fecha em 3 s, erro fica ate o aluno fechar. */
  duracaoMs?: number
}

/** Distancia arrastada para baixo (px) a partir da qual o pop-up some. */
const LIMITE_ARRASTE = 60

/**
 * Pop-up flutuante de feedback (salvo ou erro). Fica fixo no canto da tela,
 * fora do fluxo da pagina, e e anunciado na hora pelo leitor de tela.
 * No celular pode ser arrastado para baixo para sumir.
 */
function Notificacao({ tipo, mensagem, onFechar, duracaoMs = tipo === 'sucesso' ? 3000 : 0 }: Props) {
  const inicioY = useRef<number | null>(null)
  const [deslocamento, setDeslocamento] = useState(0)
  const [emUso, setEmUso] = useState(false)
  const arrastando = deslocamento > 0
  // As telas passam `onFechar` como funcao inline; guardar a ultima evita reiniciar o tempo a cada render.
  const fechar = useRef(onFechar)
  useLayoutEffect(() => { fechar.current = onFechar })
  // Mensagem em JSX e um objeto novo a cada render: so o texto reinicia o tempo.
  const chaveDaMensagem = typeof mensagem === 'string' ? mensagem : ''

  // Com o mouse em cima, o foco dentro ou durante o arraste, o tempo fica pausado; depois recomeca.
  useEffect(() => {
    if (!duracaoMs || arrastando || emUso) return
    const id = window.setTimeout(() => fechar.current(), duracaoMs)
    return () => window.clearTimeout(id)
  }, [chaveDaMensagem, duracaoMs, arrastando, emUso])

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar.current() }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  function aoPressionar(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button, a')) return
    inicioY.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  function aoMover(e: PointerEvent<HTMLDivElement>) {
    if (inicioY.current !== null) setDeslocamento(Math.max(0, e.clientY - inicioY.current))
  }
  // A distancia vem do proprio evento: num arraste rapido o estado ainda nao atualizou.
  function aoSoltar(e: PointerEvent<HTMLDivElement>) {
    if (inicioY.current === null) return
    const distancia = e.clientY - inicioY.current
    inicioY.current = null
    if (distancia >= LIMITE_ARRASTE) onFechar()
    else setDeslocamento(0)
  }

  return (
    <div className={`notificacao notificacao--${tipo}${arrastando ? ' notificacao--arrastando' : ''}`} role="alert" aria-live="assertive"
      style={arrastando ? { transform: `translateY(${deslocamento}px)`, opacity: Math.max(0.2, 1 - deslocamento / 150) } : undefined}
      onPointerDown={aoPressionar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}
      onMouseEnter={() => setEmUso(true)} onMouseLeave={() => setEmUso(false)}
      onFocus={() => setEmUso(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setEmUso(false) }}>
      <span className="notificacao__icone" aria-hidden="true">{tipo === 'sucesso' ? '✓' : '!'}</span>
      <p className="notificacao__mensagem">{mensagem}</p>
      <button type="button" className="notificacao__fechar" aria-label="Fechar notificação" onClick={onFechar}>×</button>
    </div>
  )
}

export default Notificacao
