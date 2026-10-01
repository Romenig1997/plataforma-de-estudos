import { useState } from 'react'

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
 * Cadastro de usuario da HU01, movido para um componente proprio na HU02.
 *
 * <p>Nenhuma regra mudou: mesmo contrato com a API, mesmas mensagens, mesmo
 * tratamento de rede. A unica alteracao e o nome das classes CSS, que antes
 * nao existiam no stylesheet e agora usam o mesmo padrao das demais telas.
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
      <section className="cartao">
        <header className="cartao__cabecalho">
          <h1>Cadastro de Usuário</h1>
          <p>Preencha os campos abaixo para criar sua conta.</p>
        </header>

        {mensagem && (
          <div
            className={mensagem.tipo === 'sucesso' ? 'aviso aviso--sucesso' : 'aviso aviso--erro'}
            role="alert"
            aria-live="polite"
          >
            {mensagem.texto}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="campo">
            <label htmlFor="nome">Nome completo</label>
            <input
              id="nome"
              name="nome"
              type="text"
              autoComplete="name"
              placeholder="Digite seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              aria-invalid={obterErro('nome') ? 'true' : 'false'}
              aria-describedby={obterErro('nome') ? 'nome-erro' : undefined}
              disabled={enviando}
              maxLength={120}
              required
            />
            {obterErro('nome') && (
              <p id="nome-erro" className="campo__erro" role="alert">
                {obterErro('nome')}
              </p>
            )}
          </div>

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
              aria-invalid={obterErro('email') ? 'true' : 'false'}
              aria-describedby={obterErro('email') ? 'email-erro' : undefined}
              disabled={enviando}
              maxLength={180}
              required
            />
            {obterErro('email') && (
              <p id="email-erro" className="campo__erro" role="alert">
                {obterErro('email')}
              </p>
            )}
          </div>

          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              name="senha"
              type="password"
              autoComplete="new-password"
              placeholder="Digite sua senha (mínimo 8 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              aria-invalid={obterErro('senha') ? 'true' : 'false'}
              aria-describedby={obterErro('senha') ? 'senha-erro' : undefined}
              disabled={enviando}
              minLength={8}
              required
            />
            {obterErro('senha') && (
              <p id="senha-erro" className="campo__erro" role="alert">
                {obterErro('senha')}
              </p>
            )}
          </div>

          <button type="submit" className="btn-enviar" disabled={enviando}>
            {enviando ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="link-alternativo">
          Já tem conta?{' '}
          <button type="button" className="link-alternativo__acao" onClick={onIrParaLogin} disabled={enviando}>
            Entrar
          </button>
        </p>
      </section>
    </main>
  )
}

export default TelaCadastro