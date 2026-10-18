import { useState } from 'react'
import { alterarSenha, ErroDeAutenticacao, sair } from './autenticacao'
import { ErroDeRede } from './sessao'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'

type Props = {
  onEncerrarSessao: (motivo?: string) => void
  onVoltar: () => void
}

/** Troca de senha e encerramento das sessoes, ambos no Supabase Auth. */
export default function TelaSeguranca({ onEncerrarSessao, onVoltar }: Props) {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<{ tipo: 'erro' | 'sucesso'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const trocar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    const errosLocais: Record<string, string> = {}
    if (!atual) errosLocais['senha-atual'] = 'Informe a senha atual.'
    if (nova.length < 8) errosLocais['senha-nova'] = 'A nova senha deve ter pelo menos 8 caracteres.'
    if (nova !== confirmacao) errosLocais['senha-confirmacao'] = 'Repita exatamente a mesma senha.'
    setErros(errosLocais)
    setMensagem(null)
    if (Object.keys(errosLocais).length > 0) return

    setEnviando(true)
    try {
      await alterarSenha(atual, nova)
      setAtual('')
      setNova('')
      setConfirmacao('')
      setMensagem({ tipo: 'sucesso', texto: 'Senha alterada com sucesso.' })
    } catch (erro) {
      if (erro instanceof ErroDeAutenticacao && erro.campo === 'senha') {
        setErros(erro.codigo === 'invalid_credentials' ? { 'senha-atual': erro.message } : { 'senha-nova': erro.message })
      } else if (erro instanceof ErroDeRede) {
        setMensagem({ tipo: 'erro', texto: 'Não foi possível conectar ao serviço de autenticação. Tente novamente.' })
      } else {
        setMensagem({ tipo: 'erro', texto: erro instanceof Error ? erro.message : 'Não foi possível alterar a senha.' })
      }
    } finally {
      setEnviando(false)
    }
  }

  const encerrarTodas = async () => {
    setEnviando(true)
    await sair('global')
    setEnviando(false)
    onEncerrarSessao('Todas as sessões foram encerradas. Faça login novamente.')
  }

  return (
    <main className="tela">
      <Cartao titulo="Segurança da conta" descricao="Altere sua senha ou encerre o acesso em todos os dispositivos.">
        {mensagem && <Notificacao tipo={mensagem.tipo} mensagem={mensagem.texto} onFechar={() => setMensagem(null)} />}
        <form onSubmit={trocar} noValidate>
          <CampoFormulario id="senha-atual" rotulo="Senha atual" erro={erros['senha-atual']}>
            <input type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required disabled={enviando} />
          </CampoFormulario>
          <CampoFormulario id="senha-nova" rotulo="Nova senha" ajuda="Use pelo menos 8 caracteres." erro={erros['senha-nova']}>
            <input type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} required disabled={enviando} />
          </CampoFormulario>
          <CampoFormulario id="senha-confirmacao" rotulo="Repita a nova senha" erro={erros['senha-confirmacao']}>
            <input type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required disabled={enviando} />
          </CampoFormulario>
          <div className="acoes acoes--em-linha">
            <Botao type="submit" carregando={enviando}>{enviando ? 'Salvando...' : 'Alterar senha'}</Botao>
            <Botao type="button" variante="secundario" onClick={onVoltar} disabled={enviando}>Voltar</Botao>
          </div>
        </form>
        <hr className="separador" />
        <h3>Encerrar sessões</h3>
        <p>Use se perdeu acesso a algum dispositivo. Esta aba também será encerrada.</p>
        <Botao type="button" variante="secundario" onClick={encerrarTodas} disabled={enviando}>Encerrar todas as sessões</Botao>
      </Cartao>
    </main>
  )
}
