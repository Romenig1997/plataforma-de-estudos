import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { CircleAlertIcon, CircleCheckIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const Icone = tipo === 'sucesso' ? CircleCheckIcon : CircleAlertIcon
  return (
    <div
      className={cn(
        'fixed inset-x-4 bottom-20 z-50 flex touch-none items-start gap-3 rounded-xl border border-l-4 bg-popover p-4 text-popover-foreground shadow-xl select-none animate-in fade-in-0 slide-in-from-bottom-4 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[26rem]',
        tipo === 'sucesso' ? 'border-l-success' : 'border-l-destructive',
        arrastando ? 'cursor-grabbing transition-none' : 'transition-[transform,opacity] duration-150',
      )}
      role="alert"
      aria-live="assertive"
      data-tipo={tipo}
      data-arrastando={arrastando ? 'true' : undefined}
      style={arrastando ? { transform: `translateY(${deslocamento}px)`, opacity: Math.max(0.2, 1 - deslocamento / 150) } : undefined}
      onPointerDown={aoPressionar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}
      onMouseEnter={() => setEmUso(true)} onMouseLeave={() => setEmUso(false)}
      onFocus={() => setEmUso(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setEmUso(false) }}>
      <Icone className={cn('mt-0.5 size-5 shrink-0', tipo === 'sucesso' ? 'text-success' : 'text-destructive')} aria-hidden="true" />
      <p className="m-0 min-w-0 flex-1 text-sm leading-relaxed [&_a]:font-semibold [&_a]:text-primary [&_a]:underline [&_button]:font-semibold [&_button]:text-primary [&_button]:underline">{mensagem}</p>
      <button type="button" className="-m-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Fechar notificação" onClick={onFechar}>
        <XIcon className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

export default Notificacao
