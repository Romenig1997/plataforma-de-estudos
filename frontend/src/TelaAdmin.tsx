import { useCallback, useEffect, useState } from 'react'
import { listarUsuarios, type UsuarioAdmin } from './admin'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'

type Props = {
  token: string
  /** Volta para a area autenticada (HU02), sem sair da sessao. */
  onVoltar: () => void
  /** Encerra a sessao quando o token expira no meio do uso da tela. */
  onEncerrarSessao: (motivo?: string) => void
}

function mensagemDeFalha(falha: unknown): string {
  if (falha instanceof ErroDeRede) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
  }

  if (falha instanceof ErroDeApi) {
    // O 403 vem com o campo `autorizacao` preenchido pelo backend.
    const mensagem = falha.mensagemDoCampo('autorizacao')
    if (mensagem) return mensagem
  }

  return 'Não foi possível carregar a lista de usuários. Tente novamente.'
}

/**
 * Area admin da HU04: a tela restrita que so ADMIN ve.
 *
 * <p>A existencia do botao ja e decidida na TelaAutenticada pelo perfil do
 * usuario. Esta tela trata o caso do acesso forcado (rota chamada sem ser
 * ADMIN): o 403 chega como `ErroDeApi` com o campo `autorizacao` e e
 * mostrado sem encerrar a sessao.
 */
function TelaAdmin({ token, onVoltar, onEncerrarSessao }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    // `descartado` evita que a resposta de uma requisicao que ja nao
    // interessa escreva no estado (mesmo cuidado da TelaAutenticada).
    let descartado = false

    listarUsuarios(token)
      .then((lista) => {
        if (!descartado) setUsuarios(lista)
      })
      .catch((falha: unknown) => {
        if (descartado) return

        if (falha instanceof SessaoEncerrada) {
          onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
          return
        }

        setErro(mensagemDeFalha(falha))
      })
      .finally(() => {
        if (!descartado) setCarregando(false)
      })

    return () => {
      descartado = true
    }
  }, [token, onEncerrarSessao, tentativa])

  const tentarNovamente = useCallback(() => {
    setUsuarios(null)
    setErro(null)
    setCarregando(true)
    setTentativa((numero) => numero + 1)
  }, [])

  return (
    <main className="tela">
      <section className="cartao cartao--largo">
        <header className="cartao__cabecalho">
          <h1>Área admin</h1>
          <p>Usuários cadastrados na plataforma.</p>
        </header>

        {erro && (
          <div className="aviso aviso--erro" role="alert" aria-live="polite">
            {erro}
          </div>
        )}

        {carregando && (
          <p className="status-carregando" role="status" aria-live="polite">
            Carregando usuários...
          </p>
        )}

        {!carregando && !erro && usuarios && usuarios.length === 0 && (
          <p className="status-carregando" role="status">
            Nenhum usuário cadastrado.
          </p>
        )}

        {!carregando && !erro && usuarios && usuarios.length > 0 && (
          <table className="tabela-admin">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nome}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.perfil}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="acoes">
          {erro && (
            <button type="button" className="btn-secundario" onClick={tentarNovamente}>
              Tentar novamente
            </button>
          )}
          <button type="button" className="btn-secundario" onClick={onVoltar}>
            Voltar
          </button>
        </div>
      </section>
    </main>
  )
}

export default TelaAdmin