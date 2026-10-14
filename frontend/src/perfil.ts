/**
 * Perfil do usuario (HU03): leitura e atualizacao dos dados do proprio
 * cadastro.
 *
 * <p>Sigo o mesmo contrato de `sessao.ts`: token no cabecalho `Authorization`,
 * e os mesmos tres erros tipados (`ErroDeApi`, `ErroDeRede`, `SessaoEncerrada`)
 * para que a tela trate falha de rede, validacao e sessao expirada sem
 * misturar os tres.
 *
 * <p>`metaEstudoSemanal` e `objetivoMotivacao` sao opcionais: `null` significa
 * "nao preenchido" - a API devolve `null` e aceita `null` de volta.
 */
import {
  ErroDeApi,
  ErroDeRede,
  SessaoEncerrada,
  lerErros,
} from './sessao'

export type Perfil = {
  id: number
  nome: string
  email: string
  metaEstudoSemanal: number | null
  objetivoMotivacao: string | null
  temFoto?: boolean
}

/** O que o PUT /api/perfil recebe: o perfil sem o `id` (que vem do token). */
export type AtualizacaoDePerfil = Omit<Perfil, 'id' | 'temFoto'>

/** 401 vira sessao encerrada; o resto vira erro de API com os erros por campo. */
async function falhaDaResposta(resposta: Response): Promise<ErroDeApi | SessaoEncerrada> {
  if (resposta.status === 401) {
    return new SessaoEncerrada()
  }
  return new ErroDeApi(resposta.status, await lerErros(resposta))
}

export async function buscarPerfil(token: string): Promise<Perfil> {
  let resposta: Response

  try {
    resposta = await fetch('/api/perfil', {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new ErroDeRede()
  }

  if (!resposta.ok) {
    throw await falhaDaResposta(resposta)
  }

  return (await resposta.json()) as Perfil
}

export async function salvarPerfil(
  token: string,
  dados: AtualizacaoDePerfil,
): Promise<Perfil> {
  let resposta: Response

  try {
    resposta = await fetch('/api/perfil', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(dados),
    })
  } catch {
    throw new ErroDeRede()
  }

  if (!resposta.ok) {
    throw await falhaDaResposta(resposta)
  }

  return (await resposta.json()) as Perfil
}
