import { useRef, useState, type FormEvent } from 'react'
import { mensagemDaFalha } from '../api'
import { atualizarOrgao, removerBanner, salvarBanner, type EditalAprovado } from '../editais'
import { ErroDeApi } from '../sessao'
import Botao from './Botao'
import CampoFormulario from './CampoFormulario'
import { CapaDoCurso } from './CartaoDeCurso'

type Props = {
  token: string
  curso: EditalAprovado
  onAtualizado: (mudancas: Partial<EditalAprovado>) => void
  onNotificar: (tipo: 'sucesso' | 'erro', mensagem: string) => void
  onEncerrarSessao: (motivo?: string) => void
}

const LIMITE_BYTES = 2 * 1024 * 1024
const TIPOS = ['image/png', 'image/jpeg']

/**
 * Capa do card do curso (ADMIN): banner atras do nome, nome e sigla do orgao.
 * A previa usa a mesma capa que os alunos veem em Meus cursos.
 */
function EditorDeCapaDoCurso({ token, curso, onAtualizado, onNotificar, onEncerrarSessao }: Props) {
  const [orgao, setOrgao] = useState(curso.orgao)
  const [sigla, setSigla] = useState(curso.sigla)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [ocupado, setOcupado] = useState<'orgao' | 'banner' | null>(null)
  const arquivo = useRef<HTMLInputElement>(null)
  const prefixo = `capa-${curso.id}`

  function falhar(falha: unknown, padrao: string) {
    if (falha instanceof ErroDeApi) setErros(Object.fromEntries(falha.erros.map(e => [e.campo, e.mensagem])))
    const mensagem = mensagemDaFalha(falha, onEncerrarSessao, padrao)
    if (mensagem) onNotificar('erro', mensagem)
  }

  async function salvarOrgao(evento: FormEvent) {
    evento.preventDefault()
    const invalidos: Record<string, string> = {}
    if (!orgao.trim()) invalidos.orgao = 'Informe o nome do órgão.'
    if (!sigla.trim()) invalidos.sigla = 'Informe a sigla do órgão.'
    else if (sigla.trim().length > 20) invalidos.sigla = 'Use até 20 caracteres na sigla.'
    setErros(invalidos)
    if (Object.keys(invalidos).length) return
    setOcupado('orgao')
    try {
      const salvo = await atualizarOrgao(token, curso.id, orgao.trim(), sigla.trim())
      onAtualizado({ orgao: salvo.orgao, sigla: salvo.sigla })
      onNotificar('sucesso', 'Órgão e sigla salvos.')
    } catch (falha: unknown) {
      falhar(falha, 'Não foi possível salvar o órgão.')
    } finally {
      setOcupado(null)
    }
  }

  async function enviarBanner(escolhido?: File) {
    if (arquivo.current) arquivo.current.value = ''
    if (!escolhido) return
    setErros({})
    if (!TIPOS.includes(escolhido.type) || escolhido.size > LIMITE_BYTES) {
      setErros({ banner: 'Selecione uma imagem PNG ou JPEG de até 2 MB.' })
      return
    }
    setOcupado('banner')
    try {
      onAtualizado({ bannerVersao: await salvarBanner(token, curso.id, escolhido) })
      onNotificar('sucesso', curso.bannerVersao ? 'Banner trocado.' : 'Banner enviado.')
    } catch (falha: unknown) {
      falhar(falha, 'Não foi possível enviar o banner.')
    } finally {
      setOcupado(null)
    }
  }

  async function tirarBanner() {
    setOcupado('banner')
    try {
      await removerBanner(token, curso.id)
      onAtualizado({ bannerVersao: null })
      onNotificar('sucesso', 'Banner removido. O card volta a usar a cor do curso.')
    } catch (falha: unknown) {
      falhar(falha, 'Não foi possível remover o banner.')
    } finally {
      setOcupado(null)
    }
  }

  return <div className="editor-capa">
    <div className="editor-capa__previa" aria-label={`Prévia do card de ${curso.titulo}`} role="img">
      <CapaDoCurso editalId={curso.id} titulo={curso.titulo} sigla={sigla.trim() || curso.sigla} bannerVersao={curso.bannerVersao} />
    </div>
    <div className="editor-capa__campos">
      <CampoFormulario id={`${prefixo}-banner`} rotulo="Banner do card"
        ajuda="PNG ou JPEG de até 2 MB. Ideal: 1200 × 400 px. O nome do curso aparece por cima." erro={erros.banner}>
        <input ref={arquivo} type="file" accept="image/png,image/jpeg" disabled={ocupado !== null} onChange={e => void enviarBanner(e.target.files?.[0])} />
      </CampoFormulario>
      {curso.bannerVersao && <Botao type="button" variante="secundario" disabled={ocupado !== null} onClick={() => void tirarBanner()}>
        {ocupado === 'banner' ? 'Removendo...' : 'Remover banner'}
      </Botao>}

      <form className="editor-capa__orgao" onSubmit={e => void salvarOrgao(e)} noValidate>
        <CampoFormulario id={`${prefixo}-orgao`} rotulo="Nome do órgão" erro={erros.orgao}>
          <input type="text" maxLength={120} value={orgao} disabled={ocupado !== null} onChange={e => setOrgao(e.target.value)} />
        </CampoFormulario>
        <CampoFormulario id={`${prefixo}-sigla`} rotulo="Sigla" ajuda="Aparece no canto da capa." erro={erros.sigla}>
          <input type="text" maxLength={20} value={sigla} disabled={ocupado !== null} onChange={e => setSigla(e.target.value)} />
        </CampoFormulario>
        <Botao type="submit" carregando={ocupado === 'orgao'}>{ocupado === 'orgao' ? 'Salvando...' : 'Salvar órgão e sigla'}</Botao>
      </form>
    </div>
  </div>
}

export default EditorDeCapaDoCurso
