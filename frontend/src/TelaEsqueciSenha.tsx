import { useState } from 'react'
import { solicitarRedefinicao } from './autenticacao'
import Notificacao, { type DadosDaNotificacao } from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'
import { Input } from '@/components/ui/input'

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Pede ao Supabase Auth o e-mail com o link de redefinicao de senha. */
export default function TelaEsqueciSenha({ onVoltar }: { onVoltar: () => void }) {
  const [email, setEmail] = useState('')
  const [erro, setErro] = useState<string | undefined>()
  const [mensagem, setMensagem] = useState<DadosDaNotificacao | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    const limpo = email.trim()
    const invalido = !limpo ? 'Informe o e-mail.' : FORMATO_EMAIL.test(limpo) ? undefined : 'Informe um e-mail válido.'
    setErro(invalido)
    if (invalido) return

    setEnviando(true)
    setMensagem(null)
    try {
      await solicitarRedefinicao(limpo)
      setMensagem({ tipo: 'sucesso', mensagem: 'Se existir uma conta com este e-mail, enviaremos um link para redefinir sua senha.' })
    } catch (falha) {
      setMensagem({ tipo: 'erro', mensagem: falha instanceof Error ? falha.message : 'Não foi possível enviar o link.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="flex w-full justify-center">
      <Cartao titulo="Recuperar senha" descricao="Informe seu e-mail para receber um link temporário.">
        {mensagem && <Notificacao {...mensagem} onFechar={() => setMensagem(null)} />}
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <CampoFormulario id="recuperar-email" rotulo="E-mail" erro={erro}>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={enviando} />
          </CampoFormulario>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Botao type="submit" carregando={enviando} className="w-full sm:w-auto">{enviando ? 'Enviando...' : 'Enviar link'}</Botao>
            <Botao type="button" variante="secundario" onClick={onVoltar}>Voltar</Botao>
          </div>
        </form>
      </Cartao>
    </main>
  )
}
