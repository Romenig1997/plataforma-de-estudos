import { useCallback, useEffect, useState } from 'react'
import { buscarSessaoAtual, ErroDeRede, SessaoEncerrada, type Usuario } from './sessao'

type Props = {
  token: string
  /**
   * Encerra a sessao no App. `motivo` preenchido aparece na tela de login, para
   * que a pessoa entenda por que voltou para ca.
   */
  onEncerrarSessao: (motivo?: string) => void
}

function mensagemDeFalha(falha: unknown): string {
  if (falha instanceof ErroDeRede) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
  }
  return 'Não foi possível carregar os seus dados. Tente novamente.'
}

/**
 * Area autenticada da HU02.
 *
 * <p>E o minimo necessario para validar o criterio de aceite da HU: mostrar
 * quem entrou, ter um botao que encerra a sessao e ler um recurso protegido
 * da API. Nao ha dashboard aqui - isso e a HU08.
 *
 * <p>A leitura de `/api/auth/me` e o que prova, no navegador, que o token
 * realmente protege algo: sem ele na resposta, a tela cairia no tratamento de
 * sessao encerrada.
 */
function TelaAutenticada({ token, onEncerrarSessao }: Props) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    // `descartado` evita que a resposta de uma requisicao que ja nao
    // interessa escreva no estado - o que aconteceria ao tentar de novo ou ao
    // desmontar a tela no meio do carregamento.
    let descartado = false

    buscarSessaoAtual(token)
      .then((dados) => {
        if (!descartado) setUsuario(dados)
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
    setErro(null)
    setCarregando(true)
    setTentativa((numero) => numero + 1)
  }, [])

  return (
    <main className="tela">
      <section className="cartao">
        <header className="cartao__cabecalho">
          <h1>Área autenticada</h1>
          <p>Sessão ativa. O conteúdo do painel entra na HU08.</p>
        </header>

        {erro && (
          <div className="aviso aviso--erro" role="alert" aria-live="polite">
            {erro}
          </div>
        )}

        {carregando && (
          <p className="status-carregando" role="status" aria-live="polite">
            Carregando seus dados...
          </p>
        )}

        {usuario && (
          <dl className="dados-sessao">
            <dt>Nome</dt>
            <dd>{usuario.nome}</dd>
            <dt>E-mail</dt>
            <dd>{usuario.email}</dd>
          </dl>
        )}

        <div className="acoes">
          {erro && (
            <button type="button" className="btn-secundario" onClick={tentarNovamente}>
              Tentar novamente
            </button>
          )}
          <button
            type="button"
            className="btn-enviar"
            onClick={() => onEncerrarSessao()}
            disabled={carregando}
          >
            Sair
          </button>
        </div>
      </section>
    </main>
  )
}

export default TelaAutenticada