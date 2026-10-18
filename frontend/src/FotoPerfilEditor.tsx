import { useEffect, useRef, useState } from 'react'
import { salvarFoto, removerFoto, validarFoto } from './fotoPerfil'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import CampoFormulario from './componentes/CampoFormulario'
import Botao from './componentes/Botao'
import Notificacao from './componentes/Notificacao'
import { Loader2Icon, Trash2Icon, UserRoundIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

type Props = {
  token: string
  /** URL publica da foto atual no Supabase Storage, ou `null`. */
  avatarUrl: string | null
  disabled?: boolean
  onEncerrarSessao: (motivo?: string) => void
  onFotoAlterada: (avatarUrl: string | null) => void
}

/**
 * Foto do perfil (HU03): previa local antes de salvar, envio ao Supabase
 * Storage pela API e remocao. A imagem atual e exibida pela URL publica.
 */
export default function FotoPerfilEditor({ token, avatarUrl, disabled = false, onEncerrarSessao, onFotoAlterada }: Props) {
  const [previa, setPrevia] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [erroDoCampo, setErroDoCampo] = useState<string | null>(null)
  // URL que o navegador nao conseguiu abrir; uma URL nova tenta de novo.
  const [urlQueFalhou, setUrlQueFalhou] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  // A previa usa um blob local: liberado ao trocar de arquivo ou sair da tela.
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa) }, [previa])

  function cancelar() {
    setErroDoCampo(null)
    setPrevia(null)
    setArquivo(null)
    if (input.current) input.current.value = ''
  }

  function escolher(selecionado?: File) {
    setErro(null)
    setAviso(null)
    cancelar()
    if (!selecionado) return
    const mensagem = validarFoto(selecionado)
    if (mensagem) {
      setErroDoCampo(mensagem)
      return
    }
    setArquivo(selecionado)
    setPrevia(URL.createObjectURL(selecionado))
  }

  function falhar(falha: unknown) {
    if (falha instanceof SessaoEncerrada) onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
    else if (falha instanceof ErroDeApi) setErro(falha.message)
    else if (falha instanceof ErroDeRede) setErro('Não foi possível conectar ao servidor. Tente novamente.')
    else setErro('Não foi possível atualizar a foto. Tente novamente.')
  }

  async function salvar() {
    if (!arquivo || ocupado) return
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      const url = await salvarFoto(token, arquivo)
      cancelar()
      onFotoAlterada(url)
      setAviso('Foto atualizada com sucesso.')
    } catch (falha) {
      falhar(falha)
    } finally {
      setOcupado(false)
    }
  }

  async function remover() {
    if (ocupado) return
    setOcupado(true)
    setErro(null)
    setAviso(null)
    try {
      await removerFoto(token)
      cancelar()
      onFotoAlterada(null)
      setAviso('Foto removida.')
    } catch (falha) {
      falhar(falha)
    } finally {
      setOcupado(false)
    }
  }

  const bloqueado = disabled || ocupado
  const imagemFalhou = avatarUrl !== null && urlQueFalhou === avatarUrl
  const exibida = previa ?? (avatarUrl && !imagemFalhou ? avatarUrl : null)

  return (
    <section aria-labelledby="foto-perfil-titulo" className="flex flex-col gap-5">
      <h2 id="foto-perfil-titulo" className="text-base font-semibold">Foto do perfil</h2>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-accent text-accent-foreground shadow-md ring-1 ring-border">
          {exibida ? (
            <img
              className="size-full object-cover"
              src={exibida}
              alt={previa ? 'Prévia da nova foto do perfil' : 'Foto atual do perfil'}
              onError={() => { if (!previa) setUrlQueFalhou(avatarUrl) }}
            />
          ) : (
            <UserRoundIcon className="size-12" aria-hidden="true" />
          )}
        </div>
        <div className="flex w-full min-w-0 flex-1 flex-col gap-3">
          {!exibida && <p className="text-sm text-muted-foreground">{imagemFalhou ? 'Não foi possível carregar sua foto agora.' : 'Você ainda não adicionou uma foto.'}</p>}
          {previa && <p className="text-sm font-medium text-warning">Prévia — a nova foto ainda não foi salva.</p>}
          {ocupado && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2Icon className="size-4 animate-spin" aria-hidden="true" />{arquivo ? 'Enviando foto...' : 'Removendo foto...'}</p>}
          {erro && <Notificacao tipo="erro" mensagem={erro} onFechar={() => setErro(null)} />}
          {aviso && <Notificacao tipo="sucesso" mensagem={aviso} onFechar={() => setAviso(null)} />}
          <CampoFormulario
            id="foto-perfil-arquivo"
            rotulo="Selecionar foto"
            ajuda="PNG ou JPEG, até 2 MB. Imagens de até 4096 pixels por lado e 8 milhões de pixels."
            erro={erroDoCampo ?? undefined}
          >
            <Input ref={input} type="file" accept="image/png,image/jpeg" disabled={bloqueado} className="cursor-pointer py-1.5" onChange={(e) => escolher(e.target.files?.[0])} />
          </CampoFormulario>
          {(arquivo || avatarUrl) && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {arquivo && (
              <>
                <Botao type="button" onClick={salvar} disabled={bloqueado}>{ocupado ? 'Salvando foto...' : 'Salvar foto'}</Botao>
                <Botao type="button" variante="secundario" onClick={cancelar} disabled={bloqueado}>Cancelar seleção</Botao>
              </>
            )}
            {avatarUrl && <Botao type="button" variante="fantasma" className="text-destructive hover:bg-destructive-soft hover:text-destructive" onClick={remover} disabled={bloqueado}><Trash2Icon aria-hidden="true" />Remover foto</Botao>}
          </div>}
        </div>
      </div>
    </section>
  )
}
