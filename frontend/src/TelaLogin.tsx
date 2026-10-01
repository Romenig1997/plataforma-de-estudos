import { useState } from 'react'
import { entrar, ErroDeApi, ErroDeRede, guardarToken, type ErroDeCampo } from './sessao'

type Props = {
  /** Recebe o token emitido. Quem decide o que fazer com ele e o App. */
  onAutenticado: (token: string) => void
  onIrParaCadastro: () => void
  /** Mensagem herdada de uma sessao encerrada (expirou ou houve logout). */
  aviso?: string | null
}

// Mesmo criterio do backend. Valida aqui evita uma ida ao servidor so para
// saber que o campo esta vazio, e devolve o erro no lugar certo na hora.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(email: string, senha: string): Record<string, string> {
  const erros: Record<string, string> = {}
  const emailLimpo = email.trim()

  if (!emailLimpo) {
    erros.email = 'Informe o e-mail.'
  } else if (!FORMATO_EMAIL.test(emailLimpo)) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (!senha) {
    erros.senha = 'Informe a senha.'
  }

  return erros
}

function TelaLogin({ onAutenticado, onIrParaCadastro, aviso }: Props) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const erroDoCampo = (campo: string) => erros[campo]

  const aplicarErrosDaApi = (errosDaApi: ErroDeCampo[]) => {
    const mapa: Record<string, string> = {}
    errosDaApi.forEach((erro) => {
      // `credenciais` nao corresponde a nenhum input: vira a mensagem geral.
      if (erro.campo !== 'email' && erro.campo !== 'senha') {
        setMensagem(erro.mensagem)
        return
      }
      mapa[erro.campo] = erro.mensagem
    })
    setErros(mapa)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (enviando) return

    setMensagem(null)

    const errosLocais = validar(email, senha)
    setErros(errosLocais)

    if (Object.keys(errosLocais).length > 0) {
      return
    }

    setEnviando(true)

    try {
      const resposta = await entrar(email.trim(), senha)

      guardarToken(resposta.token)
      onAutenticado(resposta.token)
    } catch (erro) {
      if (erro instanceof ErroDeApi) {
        aplicarErrosDaApi(erro.erros)
        if (erro.erros.length === 0) {
          setMensagem('Não foi possível entrar. Tente novamente mais tarde.')
        }
      } else if (erro instanceof ErroDeRede) {
        setMensagem(
          'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
        )
      } else {
        setMensagem('Não foi possível entrar. Tente novamente mais tarde.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="tela">
      <section className="cartao">
        <header className="cartao__cabecalho">
          <h1>Entrar na plataforma</h1>
          <p>Acesse sua conta para continuar sua preparação.</p>
        </header>

        {(aviso || mensagem) && (
          <div className="aviso aviso--erro" role="alert" aria-live="polite">
            {aviso ?? mensagem}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={erroDoCampo('email') ? 'true' : 'false'}
              aria-describedby={erroDoCampo('email') ? 'email-erro' : undefined}
              disabled={enviando}
              maxLength={180}
              required
            />
            {erroDoCampo('email') && (
              <p id="email-erro" className="campo__erro" role="alert">
                {erroDoCampo('email')}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-invalid={erroDoCampo('senha') ? 'true' : 'false'}
              aria-describedby={erroDoCampo('senha') ? 'senha-erro' : undefined}
              disabled={enviando}
              required
            />
            {erroDoCampo('senha') && (
              <p id="senha-erro" className="campo__erro" role="alert">
                {erroDoCampo('senha')}
              </p>
            )}
          </div>

          <button type="submit" className="btn-enviar" disabled={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="link-alternativo">
          Ainda não tem conta?{' '}
          <button type="button" className="link-alternativo__acao" onClick={onIrParaCadastro} disabled={enviando}>
            Cadastre-se
          </button>
        </p>
      </section>
    </main>
  )
}

export default TelaLogin