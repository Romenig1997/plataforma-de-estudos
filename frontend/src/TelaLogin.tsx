import { useState } from 'react'
import { entrar, ErroDeApi, ErroDeRede, guardarToken, type ErroDeCampo } from './sessao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'
import { reenviarConfirmacao } from './conta'

type Props = {
  /** Recebe o token emitido. Quem decide o que fazer com ele e o App. */
  onAutenticado: (token: string) => void
  onIrParaCadastro: () => void
  onIrParaRecuperacao?: () => void
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

function TelaLogin({ onAutenticado, onIrParaCadastro, onIrParaRecuperacao, aviso }: Props) {
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

  const reenviar = async () => {
    if (!email.trim() || enviando) return
    setEnviando(true); setMensagem(null)
    try { await reenviarConfirmacao(email.trim()); setMensagem('Se sua conta ainda não estiver confirmada, enviamos um novo link para seu e-mail.') }
    catch (erro) { setMensagem(erro instanceof Error ? erro.message : 'Não foi possível enviar o link.') }
    finally { setEnviando(false) }
  }

  return (
    <main className="tela">
      <Cartao titulo="Entrar na plataforma" descricao="Acesse sua conta para continuar sua preparação.">
        {(aviso || mensagem) && <Aviso tipo="erro">{aviso ?? mensagem}</Aviso>}

        <form onSubmit={handleSubmit} noValidate>
          <CampoFormulario id="email" rotulo="E-mail" erro={erroDoCampo('email')}>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={enviando}
              maxLength={180}
              required
            />
          </CampoFormulario>

          <CampoFormulario id="senha" rotulo="Senha" erro={erroDoCampo('senha')}>
            <input
              name="senha"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
              required
            />
          </CampoFormulario>

          <Botao type="submit" carregando={enviando}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </Botao>
        </form>

        <p className="link-alternativo">
          Ainda não tem conta?{' '}
          <button type="button" className="link-alternativo__acao" onClick={onIrParaCadastro} disabled={enviando}>
            Cadastre-se
          </button>
        </p>
        <p className="link-alternativo"><button type="button" className="link-alternativo__acao" onClick={onIrParaRecuperacao} disabled={enviando}>Esqueci minha senha</button></p>
        {mensagem?.includes('Confirme seu e-mail') && <p className="link-alternativo"><button type="button" className="link-alternativo__acao" onClick={reenviar} disabled={enviando}>Reenviar confirmação de e-mail</button></p>}
      </Cartao>
    </main>
  )
}

export default TelaLogin
