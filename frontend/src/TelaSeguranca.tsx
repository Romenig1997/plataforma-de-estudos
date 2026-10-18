import { useState } from 'react'
import { alterarSenha, ErroDeAutenticacao, sair } from './autenticacao'
import { ErroDeRede } from './sessao'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import { CabecalhoDaPagina, Conteudo } from './componentes/Pagina'
import { KeyRoundIcon, MonitorSmartphoneIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

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
    <Conteudo largura="estreita">
      <CabecalhoDaPagina sobretitulo="MINHA CONTA" titulo="Segurança da conta" descricao="Altere sua senha ou encerre o acesso em todos os dispositivos." />
      {mensagem && <Notificacao tipo={mensagem.tipo} mensagem={mensagem.texto} onFechar={() => setMensagem(null)} />}
      <Card>
        <CardContent>
          <form onSubmit={trocar} noValidate className="flex flex-col gap-5">
            <h2 className="flex items-center gap-2 text-base font-semibold"><KeyRoundIcon className="size-4 text-primary" aria-hidden="true" />Alterar senha</h2>
            <CampoFormulario id="senha-atual" rotulo="Senha atual" erro={erros['senha-atual']}>
              <Input type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} required disabled={enviando} />
            </CampoFormulario>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <CampoFormulario id="senha-nova" rotulo="Nova senha" ajuda="Use pelo menos 8 caracteres." erro={erros['senha-nova']}>
                <Input type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} required disabled={enviando} />
              </CampoFormulario>
              <CampoFormulario id="senha-confirmacao" rotulo="Repita a nova senha" erro={erros['senha-confirmacao']}>
                <Input type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required disabled={enviando} />
              </CampoFormulario>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
              <Botao type="button" variante="secundario" onClick={onVoltar} disabled={enviando}>Voltar</Botao>
              <Botao type="submit" carregando={enviando}>{enviando ? 'Salvando...' : 'Alterar senha'}</Botao>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-col gap-1">
            <h2 className="flex items-center gap-2 text-base font-semibold"><MonitorSmartphoneIcon className="size-4 text-destructive" aria-hidden="true" />Encerrar sessões</h2>
            <p className="text-sm text-muted-foreground">Use se perdeu acesso a algum dispositivo. Esta aba também será encerrada.</p>
          </div>
          <Botao type="button" variante="perigo" onClick={encerrarTodas} disabled={enviando}>Encerrar todas as sessões</Botao>
        </CardContent>
      </Card>
    </Conteudo>
  )
}
