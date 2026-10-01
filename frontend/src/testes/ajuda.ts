import { vi } from 'vitest'

/**
 * Utilidades compartilhadas pelos testes da HU02.
 *
 * <p>O `jsdom` (ambiente dos testes) nao implementa `fetch`. Em vez de subir a
 * aplicacao de verdade em cada teste, cada um declara o que a API responde
 * naquele cenario. Assim o teste descreve o comportamento do frontend, sem
 * depender de rede.
 */

export type ChamadaFetch = {
  url: string
  init?: RequestInit | undefined
}

/**
 * Resposta minima com o que o codigo da aplicacao usa de `Response`:
 * `ok`, `status` e `json()`.
 */
export function respostaJson(status: number, corpo?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (corpo === undefined) {
        throw new Error('corpo ausente')
      }
      return corpo
    },
  } as unknown as Response
}

/**
 * Instala um `fetch` falso e devolve o espiao, para o teste conferir o que foi
 * enviado (corpo da requisicao, cabecalho Authorization).
 */
export function instalarFetch(
  manipulador: (chamada: ChamadaFetch) => Response | Promise<Response>,
) {
  const espiao = vi.fn((entrada: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(manipulador({ url: String(entrada), init })),
  )

  vi.stubGlobal('fetch', espiao)
  return espiao
}

/** Corpo JSON enviado na requisicao, ja convertido de volta para objeto. */
export function corpoEnviado(chamada: ChamadaFetch): Record<string, unknown> {
  return JSON.parse(String(chamada.init?.body ?? '{}')) as Record<string, unknown>
}