import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { redefinirSenha } from './conta'
import { ErroDeApi, ErroDeRede } from './sessao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'

export default function TelaRedefinirSenha({ onIrParaLogin }: { onIrParaLogin: () => void }) {
  const [params] = useSearchParams(); const token = params.get('token') ?? ''
  const [senha, setSenha] = useState(''); const [confirmacao, setConfirmacao] = useState(''); const [mensagem, setMensagem] = useState<string | null>(null); const [enviando, setEnviando] = useState(false)
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); if (!token) { setMensagem('Este link é inválido. Solicite outro.'); return }
    if (senha.length < 8 || senha !== confirmacao) { setMensagem('Use uma senha de ao menos 8 caracteres e repita exatamente a mesma senha.'); return }
    setEnviando(true); setMensagem(null)
    try { await redefinirSenha(token, senha); setMensagem('Senha redefinida com sucesso. Agora você já pode entrar.') }
    catch (erro) { setMensagem(erro instanceof ErroDeApi || erro instanceof ErroDeRede ? erro.message : 'Não foi possível redefinir a senha.') }
    finally { setEnviando(false) }
  }
  return <main className="tela"><Cartao titulo="Definir nova senha" descricao="Escolha uma senha com pelo menos 8 caracteres.">
    {mensagem && <Aviso tipo={mensagem.includes('sucesso') ? 'sucesso' : 'erro'}>{mensagem}</Aviso>}
    <form onSubmit={enviar}><CampoFormulario id="nova-senha" rotulo="Nova senha"><input id="nova-senha" type="password" autoComplete="new-password" value={senha} onChange={e => setSenha(e.target.value)} required disabled={enviando} /></CampoFormulario>
      <CampoFormulario id="confirmar-nova-senha" rotulo="Repita a nova senha"><input id="confirmar-nova-senha" type="password" autoComplete="new-password" value={confirmacao} onChange={e => setConfirmacao(e.target.value)} required disabled={enviando} /></CampoFormulario>
      <div className="acoes acoes--em-linha"><Botao type="submit" carregando={enviando}>{enviando ? 'Salvando...' : 'Redefinir senha'}</Botao><Botao type="button" variante="secundario" onClick={onIrParaLogin}>Ir para login</Botao></div>
    </form>
  </Cartao></main>
}
