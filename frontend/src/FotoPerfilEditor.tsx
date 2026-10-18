import { useEffect, useRef, useState } from 'react'
import { salvarFoto, removerFoto, validarFoto } from './fotoPerfil'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import CampoFormulario from './componentes/CampoFormulario'
import Botao from './componentes/Botao'
import Notificacao from './componentes/Notificacao'

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
    <section aria-labelledby="foto-perfil-titulo" className="foto-perfil">
      <h2 id="foto-perfil-titulo">Foto do perfil</h2>
      {exibida ? (
        <img
          className="foto-perfil__imagem"
          src={exibida}
          alt={previa ? 'Prévia da nova foto do perfil' : 'Foto atual do perfil'}
          onError={() => { if (!previa) setUrlQueFalhou(avatarUrl) }}
        />
      ) : (
        <p>{imagemFalhou ? 'Não foi possível carregar sua foto agora.' : 'Você ainda não adicionou uma foto.'}</p>
      )}
      {previa && <p>Prévia — a nova foto ainda não foi salva.</p>}
      {ocupado && <p role="status">{arquivo ? 'Enviando foto...' : 'Removendo foto...'}</p>}
      {erro && <Notificacao tipo="erro" mensagem={erro} onFechar={() => setErro(null)} />}
      {aviso && <Notificacao tipo="sucesso" mensagem={aviso} onFechar={() => setAviso(null)} />}
      <CampoFormulario
        id="foto-perfil-arquivo"
        rotulo="Selecionar foto"
        ajuda="PNG ou JPEG, até 2 MB. Imagens de até 4096 pixels por lado e 8 milhões de pixels."
        erro={erroDoCampo ?? undefined}
      >
        <input ref={input} type="file" accept="image/png,image/jpeg" disabled={bloqueado} onChange={(e) => escolher(e.target.files?.[0])} />
      </CampoFormulario>
      <div className="acoes acoes--em-linha">
        {arquivo && (
          <>
            <Botao type="button" onClick={salvar} disabled={bloqueado}>{ocupado ? 'Salvando foto...' : 'Salvar foto'}</Botao>
            <Botao type="button" variante="secundario" onClick={cancelar} disabled={bloqueado}>Cancelar seleção</Botao>
          </>
        )}
        {avatarUrl && <Botao type="button" variante="secundario" onClick={remover} disabled={bloqueado}>Remover foto</Botao>}
      </div>
    </section>
  )
}
