import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

/**
 * Preparacao comum dos testes de tela (HU02).
 *
 * - `@testing-library/jest-dom/vitest` registra os verificadores de DOM
 *   (`toBeInTheDocument`, `toHaveTextContent`, ...).
 * - O `cleanup` desmonta o componente renderizado entre os testes, para que um
 *   nao enxergue o DOM do anterior.
 * - `unstubAllGlobals` desfaz o `vi.stubGlobal('fetch', ...)`, devolvendo a
 *   pagina ao estado inicial para o proximo teste.
 */
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
// O jsdom nao implementa rolagem; o layout rola ao topo a cada troca de rota.
window.scrollTo = () => {}

// APIs de layout que os componentes Radix (shadcn/ui) usam e o jsdom nao tem.
class ResizeObserverDeTeste {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverDeTeste as unknown as typeof ResizeObserver
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
