import { useState } from 'react'
import { entrar, ErroDeAutenticacao, sair } from './autenticacao'
import { mensagemDaFalha } from './api'
import { excluirConta } from './perfil'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import { Trash2Icon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type Props = {
  email: string
  administrador: boolean
  onEncerrarSessao: (motivo?: string) => void
}

/**
 * Exclusao da propria conta (HU16). Pede a senha de novo antes de apagar:
 * quem achar o computador com a sessao aberta nao consegue excluir a conta.
 */
export default function ExclusaoDeConta({ email, administrador, onEncerrarSessao }: Props) {
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const [erroDaSenha, setErroDaSenha] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  function cancelar() {
    setAberto(false)
    setSenha('')
    setErroDaSenha(null)
    setErro(null)
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault()
    if (excluindo) return
    setErro(null)
    if (!senha) {
      setErroDaSenha('Informe a sua senha para confirmar.')
      return
    }
    setErroDaSenha(null)
    setExcluindo(true)
    let tokenConfirmado: string
    try {
      tokenConfirmado = await entrar(email, senha)
    } catch (falha) {
      setExcluindo(false)
      if (falha instanceof ErroDeAutenticacao && falha.codigo === 'invalid_credentials') setErroDaSenha('Senha incorreta.')
      else setErro(falha instanceof Error ? falha.message : 'Não foi possível confirmar a sua senha.')
      return
    }
    try {
      await excluirConta(tokenConfirmado)
    } catch (falha) {
      setExcluindo(false)
      const mensagem = mensagemDaFalha(falha, onEncerrarSessao, 'Não foi possível excluir a sua conta. Tente novamente.')
      if (mensagem) setErro(mensagem)
      return
    }
    await sair('local')
    onEncerrarSessao('Sua conta foi excluída. Você pode criar uma nova conta quando quiser.')
  }

  return (
    <Card className="border-destructive/30">
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Trash2Icon className="size-4 text-destructive" aria-hidden="true" />Excluir conta</h2>
          <p className="text-sm text-muted-foreground">
            Apaga definitivamente o seu planner, o cronograma, as aulas concluídas, as respostas das questões, a foto e o acesso à plataforma.
          </p>
        </div>
        {administrador
          ? <Aviso tipo="info">Administradores não podem excluir a própria conta. Peça a outro administrador para alterar o seu perfil para aluno antes.</Aviso>
          : !aberto
            ? <div><Botao type="button" variante="perigo" onClick={() => setAberto(true)}>Excluir minha conta</Botao></div>
            : <form onSubmit={confirmar} noValidate className="flex flex-col gap-4 rounded-lg border border-destructive/30 bg-destructive-soft p-4" aria-label="Confirmar exclusão da conta">
              <p className="text-sm font-medium text-destructive">Esta ação não pode ser desfeita.</p>
              {erro && <Aviso tipo="erro">{erro}</Aviso>}
              <CampoFormulario id="senha-exclusao" rotulo="Digite a sua senha para confirmar" erro={erroDaSenha ?? undefined}>
                <Input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} disabled={excluindo} />
              </CampoFormulario>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Botao type="button" variante="secundario" onClick={cancelar} disabled={excluindo}>Cancelar</Botao>
                <Botao type="submit" variante="perigo" carregando={excluindo}>{excluindo ? 'Excluindo...' : 'Excluir definitivamente'}</Botao>
              </div>
            </form>}
      </CardContent>
    </Card>
  )
}
