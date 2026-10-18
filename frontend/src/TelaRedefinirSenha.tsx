import { useState } from 'react'
import { definirNovaSenha, sair } from './autenticacao'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'
import { Input } from '@/components/ui/input'

/**
 * Nova senha a partir do link enviado pelo Supabase Auth. O link abre uma
 * sessao temporaria; depois da troca ela e encerrada e a pessoa entra de novo.
 */
export default function TelaRedefinirSenha({ onIrParaLogin }: { onIrParaLogin: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enviando) return
    const errosLocais: Record<string, string> = {}
    if (senha.length < 8) errosLocais['nova-senha'] = 'A senha deve ter pelo menos 8 caracteres.'
    if (senha !== confirmacao) errosLocais['confirmar-nova-senha'] = 'Repita exatamente a mesma senha.'
    setErros(errosLocais)
    setMensagem(null)
    if (Object.keys(errosLocais).length > 0) return

    setEnviando(true)
    try {
      await definirNovaSenha(senha)
      await sair()
      setSenha('')
      setConfirmacao('')
      setMensagem({ tipo: 'sucesso', texto: 'Senha redefinida com sucesso. Agora você já pode entrar.' })
    } catch (falha) {
      setMensagem({ tipo: 'erro', texto: falha instanceof Error ? falha.message : 'Não foi possível redefinir a senha.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="flex w-full justify-center">
      <Cartao titulo="Definir nova senha" descricao="Escolha uma senha com pelo menos 8 caracteres.">
        {mensagem && <Notificacao tipo={mensagem.tipo} mensagem={mensagem.texto} onFechar={() => setMensagem(null)} />}
        <form onSubmit={enviar} noValidate className="flex flex-col gap-4">
          <CampoFormulario id="nova-senha" rotulo="Nova senha" erro={erros['nova-senha']}>
            <Input type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} required disabled={enviando} />
          </CampoFormulario>
          <CampoFormulario id="confirmar-nova-senha" rotulo="Repita a nova senha" erro={erros['confirmar-nova-senha']}>
            <Input type="password" autoComplete="new-password" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} required disabled={enviando} />
          </CampoFormulario>
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Botao type="submit" carregando={enviando} className="w-full sm:w-auto">{enviando ? 'Salvando...' : 'Redefinir senha'}</Botao>
            <Botao type="button" variante="secundario" onClick={onIrParaLogin}>Ir para login</Botao>
          </div>
        </form>
      </Cartao>
    </main>
  )
}
