import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { confirmarEmail } from './conta'
import Cartao from './componentes/Cartao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'

export default function TelaConfirmarEmail({ onIrParaLogin }: { onIrParaLogin: () => void }) {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''
  const [mensagem, setMensagem] = useState(token ? 'Confirmando seu e-mail...' : 'Este link é inválido. Solicite outro.')
  const [sucesso, setSucesso] = useState(false)
  useEffect(() => { if (!token) return
    confirmarEmail(token).then(() => { setSucesso(true); setMensagem('E-mail confirmado. Sua conta está ativa.') }).catch(erro => setMensagem(erro instanceof Error ? erro.message : 'Não foi possível confirmar seu e-mail.')) }, [token])
  return <main className="tela"><Cartao titulo="Confirmação de e-mail" descricao="Estamos ativando sua conta."><Aviso tipo={sucesso ? 'sucesso' : 'erro'}>{mensagem}</Aviso><Botao type="button" onClick={onIrParaLogin}>Ir para login</Botao></Cartao></main>
}
