import { useState } from 'react'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'

type Props = {
  /** Volta para a tela de login. */
  onIrParaLogin: () => void
}

type ErroCampo = {
  campo: string
  mensagem: string
}

type RespostaDeErro = {
  erros: ErroCampo[]
}

type CadastroUsuarioResponse = {
  id: number
  nome: string
  email: string
}

type Mensagem = {
  tipo: 'sucesso' | 'erro'
  texto: string
}

/**
 * Cadastro de usuario da HU01.
 *
 * <p>Nenhuma regra mudou desde a HU02: mesmo contrato com a API, mesmas
 * mensagens, mesmo tratamento de rede. Na HU06 o markup passou a usar os
 * componentes base (Cartao, CampoFormulario, Botao, Aviso).
 */
function TelaCadastro({ onIrParaLogin }: Props) {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [enviando, setEnviando] = useState(false)

  const obterErro = (campo: string) => erros[campo]

  const limparErros = () => setErros({})

  const extrairErros = (dados: RespostaDeErro) => {
    const mapa: Record<string, string> = {}
    dados.erros?.forEach((erro) => {
      mapa[erro.campo] = erro.mensagem
    })
    setErros(mapa)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (enviando) return

    setEnviando(true)
    setMensagem(null)
    limparErros()

    try {
      const resposta = await fetch('/api/usuarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          email: email.trim(),
          senha,
        }),
      })

      if (resposta.status === 201) {
        const dados = (await resposta.json()) as CadastroUsuarioResponse
        setMensagem({
          tipo: 'sucesso',
          texto: `Cadastro realizado com sucesso! ID: ${dados.id}`,
        })
        setNome('')
        setEmail('')
        setSenha('')
        return
      }

      if (resposta.status === 400 || resposta.status === 409) {
        const dados = (await resposta.json()) as RespostaDeErro
        extrairErros(dados)
        if (resposta.status === 409) {
          setMensagem({
            tipo: 'erro',
            texto: 'Não foi possível cadastrar o usuário.',
          })
        }
        return
      }

      if (!resposta.ok) {
        setMensagem({
          tipo: 'erro',
          texto: 'Erro ao cadastrar usuário. Tente novamente mais tarde.',
        })
        return
      }
    } catch {
      setMensagem({
        tipo: 'erro',
        texto: 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
      })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="tela">
      <Cartao
        titulo="Cadastro de Usuário"
        descricao="Preencha os campos abaixo para criar sua conta."
      >
        {mensagem && <Aviso tipo={mensagem.tipo}>{mensagem.texto}</Aviso>}

        <form onSubmit={handleSubmit} noValidate>
          <CampoFormulario id="nome" rotulo="Nome completo" erro={obterErro('nome')}>
            <input
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

          <CampoFormulario id="email" rotulo="E-mail" erro={obterErro('email')}>
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

          <CampoFormulario id="senha" rotulo="Senha" erro={obterErro('senha')}>
            <input
              name="senha"
              type="password"
              autoComplete="new-password"
              placeholder="Digite sua senha (mínimo 8 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={enviando}
              minLength={8}
              required
            />
          </CampoFormulario>

          <Botao type="submit" carregando={enviando}>
            {enviando ? 'Cadastrando...' : 'Cadastrar'}
          </Botao>
        </form>

        <p className="link-alternativo">
          Já tem conta?{' '}
          <button type="button" className="link-alternativo__acao" onClick={onIrParaLogin} disabled={enviando}>
            Entrar
          </button>
        </p>
      </Cartao>
    </main>
  )
}

export default TelaCadastro