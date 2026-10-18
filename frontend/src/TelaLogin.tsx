import { useState } from 'react'
import { buscarSessaoAtual, ErroDeRede, type Usuario } from './sessao'
import { entrar, ErroDeAutenticacao, reenviarConfirmacao, sair } from './autenticacao'
import Notificacao, { type DadosDaNotificacao } from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'

type Props = {
  /** Recebe o access token do Supabase e o perfil da sessao. Quem decide o destino e o App. */
  onAutenticado: (token: string, usuario: Usuario) => void
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
  const [mensagem, setMensagem] = useState<DadosDaNotificacao | null>(null)
  // O aviso herdado (sessao encerrada) aparece uma vez; some ao fechar ou ao tentar entrar.
  const [avisoFechado, setAvisoFechado] = useState(false)
  const notificacao = mensagem ?? (aviso && !avisoFechado ? { tipo: 'erro' as const, mensagem: aviso } : null)
  const erroGeral = (texto: string) => setMensagem({ tipo: 'erro', mensagem: texto })
  const [enviando, setEnviando] = useState(false)

  const erroDoCampo = (campo: string) => erros[campo]
  const [emailNaoConfirmado, setEmailNaoConfirmado] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (enviando) return

    setMensagem(null)
    setAvisoFechado(true)
    setEmailNaoConfirmado(false)

    const errosLocais = validar(email, senha)
    setErros(errosLocais)

    if (Object.keys(errosLocais).length > 0) {
      return
    }

    setEnviando(true)

    let token: string
    try {
      token = await entrar(email.trim(), senha)
    } catch (erro) {
      setEnviando(false)
      if (erro instanceof ErroDeAutenticacao) {
        setEmailNaoConfirmado(erro.codigo === 'email_not_confirmed')
        if (erro.campo === 'email' || erro.campo === 'senha') setErros({ [erro.campo]: erro.message })
        else erroGeral(erro.message)
      } else if (erro instanceof ErroDeRede) {
        erroGeral('Não foi possível conectar ao serviço de autenticação. Verifique sua conexão.')
      } else {
        erroGeral('Não foi possível entrar. Tente novamente mais tarde.')
      }
      return
    }

    // Com a sessao aberta no Supabase, o perfil (papel e foto) vem da API.
    try {
      onAutenticado(token, await buscarSessaoAtual(token))
    } catch (erro) {
      await sair()
      if (erro instanceof ErroDeRede) {
        erroGeral(
          'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
        )
      } else {
        erroGeral('Não foi possível carregar seu perfil. Tente novamente mais tarde.')
      }
    } finally {
      setEnviando(false)
    }
  }

  const reenviar = async () => {
    if (!email.trim() || enviando) return
    setEnviando(true); setMensagem(null); setAvisoFechado(true)
    try { await reenviarConfirmacao(email.trim()); setMensagem({ tipo: 'sucesso', mensagem: 'Se sua conta ainda não estiver confirmada, enviamos um novo link para seu e-mail.' }) }
    catch (erro) { erroGeral(erro instanceof Error ? erro.message : 'Não foi possível enviar o link.') }
    finally { setEnviando(false) }
  }

  return (
    <main className="tela">
      <Cartao titulo="Entrar na plataforma" descricao="Acesse sua conta para continuar sua preparação.">
        {notificacao && <Notificacao {...notificacao} onFechar={() => { setMensagem(null); setAvisoFechado(true) }} />}

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
        {emailNaoConfirmado && <p className="link-alternativo"><button type="button" className="link-alternativo__acao" onClick={reenviar} disabled={enviando}>Reenviar confirmação de e-mail</button></p>}
      </Cartao>
    </main>
  )
}

export default TelaLogin
