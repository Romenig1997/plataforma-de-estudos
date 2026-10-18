import { useState } from 'react'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'
import { cadastrar, ErroDeAutenticacao, sair } from './autenticacao'
import { buscarSessaoAtual, ErroDeRede, type Usuario } from './sessao'
import { Input } from '@/components/ui/input'

type Props = {
  /** Volta para a tela de login. */
  onIrParaLogin: () => void
  /** Chamado quando o Supabase abre a sessao no cadastro (confirmacao de e-mail desligada). */
  onAutenticado: (token: string, usuario: Usuario) => void
}

type Mensagem = {
  tipo: 'sucesso' | 'erro'
  texto: string
}

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TAMANHO_MINIMO_DA_SENHA = 8

/** Mesmas regras configuradas no Supabase Auth, conferidas antes do envio. */
function validarCadastro(nome: string, email: string, senha: string): Record<string, string> {
  const erros: Record<string, string> = {}
  const nomeLimpo = nome.trim()
  const emailLimpo = email.trim()

  if (!nomeLimpo) erros.nome = 'Informe seu nome.'
  else if (nomeLimpo.length > 120) erros.nome = 'O nome deve ter no máximo 120 caracteres.'

  if (!emailLimpo) erros.email = 'Informe o e-mail.'
  else if (!FORMATO_EMAIL.test(emailLimpo)) erros.email = 'Informe um e-mail válido.'

  if (!senha) erros.senha = 'Informe uma senha.'
  else if (senha.length < TAMANHO_MINIMO_DA_SENHA) erros.senha = `A senha deve ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`

  return erros
}

/**
 * Cadastro de candidato (HU01) no Supabase Auth.
 *
 * <p>A senha vai direto para o Supabase Auth; o nome segue nos metadados e o
 * gatilho do banco cria o perfil com o papel ALUNO. Com a confirmacao de
 * e-mail ligada, a conta so entra depois do link enviado por e-mail.
 */
function TelaCadastro({ onIrParaLogin, onAutenticado }: Props) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [enviando, setEnviando] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (enviando) return

    setMensagem(null)
    const errosLocais = validarCadastro(nome, email, senha)
    setErros(errosLocais)
    if (Object.keys(errosLocais).length > 0) return

    setEnviando(true)
    try {
      const resultado = await cadastrar(nome.trim(), email.trim().toLowerCase(), senha)

      if (resultado.sessao === 'iniciada') {
        try {
          onAutenticado(resultado.token, await buscarSessaoAtual(resultado.token))
        } catch {
          await sair()
          setMensagem({ tipo: 'sucesso', texto: 'Conta criada. Faça login para continuar.' })
        }
        return
      }

      setMensagem({
        tipo: 'sucesso',
        texto: 'Cadastro realizado. Confira seu e-mail e clique no link de confirmação para ativar a conta.',
      })
      setNome('')
      setEmail('')
      setSenha('')
    } catch (erro) {
      if (erro instanceof ErroDeAutenticacao && erro.campo !== 'geral') {
        setErros({ [erro.campo]: erro.message })
        setMensagem({ tipo: 'erro', texto: 'Não foi possível concluir o cadastro. Verifique os campos destacados.' })
      } else if (erro instanceof ErroDeRede) {
        setMensagem({ tipo: 'erro', texto: 'Não foi possível conectar ao serviço de cadastro. Verifique sua conexão.' })
      } else {
        setMensagem({ tipo: 'erro', texto: erro instanceof Error ? erro.message : 'Erro ao cadastrar. Tente novamente mais tarde.' })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="flex w-full justify-center">
      <Cartao titulo="Cadastro de Usuário" descricao="Crie sua conta para organizar editais, planejar os estudos e acompanhar seu desempenho.">
        {mensagem && <Notificacao tipo={mensagem.tipo} mensagem={mensagem.texto} onFechar={() => setMensagem(null)} />}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <CampoFormulario id="nome" rotulo="Nome completo" erro={erros.nome}>
            <Input
              name="nome"
              type="text"
              autoComplete="name"
              placeholder="Digite seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              disabled={enviando}
              maxLength={120}
              required
            />
          </CampoFormulario>

          <CampoFormulario id="email" rotulo="E-mail" erro={erros.email}>
            <Input
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

          <CampoFormulario id="senha" rotulo="Senha" ajuda="Use pelo menos 8 caracteres." erro={erros.senha}>
            <Input
              name="senha"
              type="password"
              autoComplete="new-password"
              placeholder="Digite sua senha (mínimo 8 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
              minLength={TAMANHO_MINIMO_DA_SENHA}
              required
            />
          </CampoFormulario>

          <Botao type="submit" carregando={enviando} tamanho="grande" className="mt-1 w-full">
            {enviando ? 'Cadastrando...' : 'Cadastrar'}
          </Botao>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{' '}
          <button type="button" className="font-semibold text-primary underline-offset-4 transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50" onClick={onIrParaLogin} disabled={enviando}>
            Entrar
          </button>
        </p>
      </Cartao>
    </main>
  )
}

export default TelaCadastro
