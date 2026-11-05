/**
 * Espera o backend acordar.
 *
 * <p>No plano gratuito do Render a API dorme apos 15 minutos sem acesso e leva
 * cerca de 1 minuto para voltar. Nesse meio tempo o proxy do Netlify responde
 * 502/503/504. Em vez de mostrar erro, a chamada e repetida ate o servidor
 * responder (ou ate o limite), e a tela mostra o aviso de espera.
 */
import { ErroDeApi, ErroDeRede } from './sessao'

export type EsperaDoServidor = {
  /** Intervalo entre as tentativas. */
  intervaloMs?: number
  /** Tempo maximo de espera antes de desistir. */
  limiteMs?: number
}

// O plano gratuito tem pouca CPU: acordar (subir o container e o Spring Boot)
// pode passar de 2 minutos. 5 minutos cobre os casos lentos com folga.
export const ESPERA_PADRAO: Required<EsperaDoServidor> = { intervaloMs: 3_000, limiteMs: 300_000 }

/** O servidor nao acordou dentro do limite. */
export class ServidorNaoAcordou extends Error {
  constructor() {
    super('O servidor demorou mais que o esperado para acordar. Tente entrar novamente em instantes.')
  }
}

/** Esperando o servidor e a pessoa desistiu. */
export class EsperaCancelada extends Error {
  constructor() {
    super('Espera cancelada.')
  }
}

/** 502, 503 e 504: o proxy nao conseguiu resposta do backend (dormindo ou subindo). */
export function servidorIndisponivel(erro: unknown): boolean {
  return erro instanceof ErroDeApi && [502, 503, 504].includes(erro.status)
}

function esperar(ms: number, sinal?: AbortSignal): Promise<void> {
  return new Promise((resolver, rejeitar) => {
    if (sinal?.aborted) return rejeitar(new EsperaCancelada())
    const id = setTimeout(() => {
      sinal?.removeEventListener('abort', cancelar)
      resolver()
    }, ms)
    function cancelar() {
      clearTimeout(id)
      rejeitar(new EsperaCancelada())
    }
    sinal?.addEventListener('abort', cancelar, { once: true })
  })
}

/**
 * Executa `chamada` e, enquanto o servidor estiver indisponivel, tenta de novo.
 * `aoAguardar` e chamado uma vez, na primeira falha, para a tela mostrar o
 * aviso. Outros erros (401, 403, 500...) sobem na hora.
 */
export async function aguardarServidor<T>(
  chamada: () => Promise<T>,
  { aoAguardar, sinal, intervaloMs = ESPERA_PADRAO.intervaloMs, limiteMs = ESPERA_PADRAO.limiteMs }:
    EsperaDoServidor & { aoAguardar?: () => void; sinal?: AbortSignal } = {},
): Promise<T> {
  const inicio = Date.now()
  let avisou = false
  for (;;) {
    try {
      return await chamada()
    } catch (erro) {
      // Uma falha de rede so conta como "acordando" depois que a espera ja
      // comecou (a conexao com o proxy pode cair enquanto o servidor sobe).
      const repetir = servidorIndisponivel(erro) || (avisou && erro instanceof ErroDeRede)
      if (!repetir) throw erro
      if (sinal?.aborted) throw new EsperaCancelada()
      if (!avisou) {
        avisou = true
        aoAguardar?.()
      }
      if (Date.now() - inicio >= limiteMs) throw new ServidorNaoAcordou()
      await esperar(intervaloMs, sinal)
    }
  }
}
