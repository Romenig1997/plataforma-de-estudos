import { describe, expect, it } from 'vitest'

import { buscarSessaoAtual, ErroDeRede, SessaoEncerrada } from './sessao'
import { instalarFetch, respostaJson } from './testes/ajuda'

/**
 * Acesso ao recurso protegido (HU02): o access token do Supabase vai no
 * cabecalho Authorization e um 401 encerra a sessao.
 */
describe('sessao', () => {
  it('buscarSessaoAtual manda o token no cabecalho Authorization', async () => {
    const fetchFalso = instalarFetch(() =>
      respostaJson(200, { id: 1, nome: 'Ana', email: 'ana@email.com', perfil: 'ALUNO', avatarUrl: null }),
    )

    const usuario = await buscarSessaoAtual('abc.def.ghi')

    expect(usuario.perfil).toBe('ALUNO')
    expect(String(fetchFalso.mock.calls[0][0])).toBe('/api/auth/me')
    const cabecalhos = new Headers(fetchFalso.mock.calls[0][1]?.headers)
    expect(cabecalhos.get('Authorization')).toBe('Bearer abc.def.ghi')
  })

  it('401 em recurso protegido significa sessao encerrada', async () => {
    instalarFetch(() =>
      respostaJson(401, {
        erros: [{ campo: 'autenticacao', mensagem: 'Faca login para acessar este recurso.' }],
      }),
    )

    await expect(buscarSessaoAtual('token-expirado')).rejects.toBeInstanceOf(SessaoEncerrada)
  })

  it('traduz falha de rede em erro proprio', async () => {
    instalarFetch(() => {
      throw new TypeError('Failed to fetch')
    })

    await expect(buscarSessaoAtual('token')).rejects.toBeInstanceOf(ErroDeRede)
  })
})
