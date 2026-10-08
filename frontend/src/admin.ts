/**
 * Area admin (HU04): recurso restrito que so ADMIN acessa.
 *
 * <p>Mesmo contrato de `sessao.ts`: token no cabecalho `Authorization` e os
 * mesmos tres erros tipados (`ErroDeApi`, `ErroDeRede`, `SessaoEncerrada`).
 * O 403 chega como `ErroDeApi` com o campo `autorizacao` — a tela mostra a
 * mensagem da API sem encerrar a sessao.
 */
import {
  ErroDeApi,
  ErroDeRede,
  SessaoEncerrada,
  lerErros,
  type PerfilDeAcesso,
} from './sessao'

export type UsuarioAdmin = {
  id: number
  nome: string
  email: string
  perfil: PerfilDeAcesso
}

/** 401 vira sessao encerrada; o resto vira erro de API com os erros por campo. */
async function falhaDaResposta(resposta: Response): Promise<ErroDeApi | SessaoEncerrada> {
  if (resposta.status === 401) {
    return new SessaoEncerrada()
  }
  return new ErroDeApi(resposta.status, await lerErros(resposta))
}

/** Lista as contas cadastradas. Rota restrita: so a authority ADMIN passa. */
export async function listarUsuarios(token: string): Promise<UsuarioAdmin[]> {
  let resposta: Response

  try {
    resposta = await fetch('/api/admin/usuarios', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new ErroDeRede()
  }

  if (!resposta.ok) {
    throw await falhaDaResposta(resposta)
  }

  return (await resposta.json()) as UsuarioAdmin[]
}