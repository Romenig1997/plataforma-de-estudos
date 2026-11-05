import { describe, expect, it, vi } from 'vitest'
import { aguardarServidor, EsperaCancelada, servidorIndisponivel, ServidorNaoAcordou } from './servidorAcordando'
import { ErroDeApi, ErroDeRede } from './sessao'

describe('aguardarServidor', () => {
  it('so 502, 503 e 504 contam como servidor indisponivel', () => {
    expect([502, 503, 504].every((s) => servidorIndisponivel(new ErroDeApi(s)))).toBe(true)
    expect(servidorIndisponivel(new ErroDeApi(500))).toBe(false)
    expect(servidorIndisponivel(new ErroDeApi(401))).toBe(false)
    expect(servidorIndisponivel(new ErroDeRede())).toBe(false)
  })

  it('repete ate o servidor responder e avisa uma unica vez', async () => {
    const chamada = vi.fn()
      .mockRejectedValueOnce(new ErroDeApi(504))
      .mockRejectedValueOnce(new ErroDeApi(503))
      .mockResolvedValue('ok')
    const aoAguardar = vi.fn()

    await expect(aguardarServidor(chamada, { aoAguardar, intervaloMs: 1 })).resolves.toBe('ok')
    expect(chamada).toHaveBeenCalledTimes(3)
    expect(aoAguardar).toHaveBeenCalledTimes(1)
  })

  it('nao avisa nem repete quando responde de primeira', async () => {
    const aoAguardar = vi.fn()
    await expect(aguardarServidor(async () => 1, { aoAguardar })).resolves.toBe(1)
    expect(aoAguardar).not.toHaveBeenCalled()
  })

  it('outros erros sobem na hora', async () => {
    const chamada = vi.fn().mockRejectedValue(new ErroDeApi(500))
    await expect(aguardarServidor(chamada, { intervaloMs: 1 })).rejects.toBeInstanceOf(ErroDeApi)
    expect(chamada).toHaveBeenCalledTimes(1)
  })

  it('desiste no limite', async () => {
    const chamada = vi.fn().mockRejectedValue(new ErroDeApi(502))
    await expect(aguardarServidor(chamada, { intervaloMs: 5, limiteMs: 20 })).rejects.toBeInstanceOf(ServidorNaoAcordou)
  })

  it('para quando a espera e cancelada', async () => {
    const espera = new AbortController()
    const chamada = vi.fn().mockRejectedValue(new ErroDeApi(504))
    const promessa = aguardarServidor(chamada, { intervaloMs: 10_000, sinal: espera.signal })
    await vi.waitFor(() => expect(chamada).toHaveBeenCalled())
    espera.abort()
    await expect(promessa).rejects.toBeInstanceOf(EsperaCancelada)
  })

  it('falha de rede durante a espera tambem e repetida', async () => {
    const chamada = vi.fn()
      .mockRejectedValueOnce(new ErroDeApi(504))
      .mockRejectedValueOnce(new ErroDeRede())
      .mockResolvedValue('ok')
    await expect(aguardarServidor(chamada, { intervaloMs: 1 })).resolves.toBe('ok')
    expect(chamada).toHaveBeenCalledTimes(3)
  })

  it('falha de rede logo na primeira chamada sobe na hora', async () => {
    const chamada = vi.fn().mockRejectedValue(new ErroDeRede())
    await expect(aguardarServidor(chamada, { intervaloMs: 1 })).rejects.toBeInstanceOf(ErroDeRede)
    expect(chamada).toHaveBeenCalledTimes(1)
  })
})
