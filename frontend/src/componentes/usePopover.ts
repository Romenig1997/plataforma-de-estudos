import { useEffect, useRef, useState } from 'react'

/**
 * Estado de um painel suspenso (menu, notificacoes, "Mais"): fecha com Esc,
 * devolvendo o foco ao gatilho, e ao clicar fora do container.
 */
export function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [aberto, setAberto] = useState(false)
  const container = useRef<T>(null)

  useEffect(() => {
    if (!aberto) return
    function fecharAoClicarFora(evento: PointerEvent) {
      if (container.current && !container.current.contains(evento.target as Node)) setAberto(false)
    }
    function fecharComEscape(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      setAberto(false)
      container.current?.querySelector<HTMLElement>('[aria-expanded]')?.focus()
    }
    document.addEventListener('pointerdown', fecharAoClicarFora)
    document.addEventListener('keydown', fecharComEscape)
    return () => {
      document.removeEventListener('pointerdown', fecharAoClicarFora)
      document.removeEventListener('keydown', fecharComEscape)
    }
  }, [aberto])

  return { aberto, setAberto, container }
}
