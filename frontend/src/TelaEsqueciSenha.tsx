import { useState } from 'react'
import { solicitarRedefinicao } from './conta'
import { ErroDeApi, ErroDeRede } from './sessao'
import Notificacao, { type DadosDaNotificacao } from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'

export default function TelaEsqueciSenha({ onVoltar }: { onVoltar: () => void }) {
  const [email, setEmail] = useState('')
  const [mensagem, setMensagem] = useState<DadosDaNotificacao | null>(null)
  const [enviando, setEnviando] = useState(false)
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); if (enviando) return
    setEnviando(true); setMensagem(null)
    try { await solicitarRedefinicao(email.trim()); setMensagem({ tipo: 'sucesso', mensagem: 'Se existir uma conta com este e-mail, enviaremos um link para redefinir sua senha.' }) }
    catch (erro) { setMensagem({ tipo: 'erro', mensagem: erro instanceof ErroDeApi || erro instanceof ErroDeRede ? erro.message : 'Não foi possível enviar o link.' }) }
    finally { setEnviando(false) }
  }
  return <main className="tela"><Cartao titulo="Recuperar senha" descricao="Informe seu e-mail para receber um link temporário.">
    {mensagem && <Notificacao {...mensagem} onFechar={() => setMensagem(null)} />}
    <form onSubmit={enviar}><CampoFormulario id="recuperar-email" rotulo="E-mail"><input id="recuperar-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={enviando} /></CampoFormulario>
      <div className="acoes acoes--em-linha"><Botao type="submit" carregando={enviando}>{enviando ? 'Enviando...' : 'Enviar link'}</Botao><Botao type="button" variante="secundario" onClick={onVoltar}>Voltar</Botao></div>
    </form>
  </Cartao></main>
}
