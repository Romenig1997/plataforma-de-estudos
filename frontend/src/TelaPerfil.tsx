import { useCallback, useEffect, useState } from 'react'
import {
  buscarPerfil,
  salvarPerfil,
  type AtualizacaoDePerfil,
  type Perfil,
} from './perfil'
import { ErroDeApi, ErroDeRede, SessaoEncerrada, type ErroDeCampo } from './sessao'
import Aviso from './componentes/Aviso'
import Notificacao from './componentes/Notificacao'
import Botao from './componentes/Botao'
import CampoFormulario from './componentes/CampoFormulario'
import Cartao from './componentes/Cartao'
import EstadoCarregando from './componentes/EstadoCarregando'
import FotoPerfilEditor from './FotoPerfilEditor'

type Props = {
  token: string
  /**
   * Encerra a sessao no App. Chamado quando o token expira no meio do uso
   * da tela - mesmo comportamento da area autenticada.
   */
  onEncerrarSessao: (motivo?: string) => void
  /** Volta para a area autenticada (HU02), sem sair da sessao. */
  onVoltar: () => void
}

type Mensagem = {
  tipo: 'sucesso' | 'erro'
  texto: string
}

// Mesmo criterio do backend. Valida aqui evita uma ida ao servidor so para
// saber que o campo esta vazio, e devolve o erro no lugar certo na hora.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validar(
  nome: string,
  email: string,
  meta: string,
  objetivo: string,
): Record<string, string> {
  const erros: Record<string, string> = {}
  const nomeLimpo = nome.trim()
  const emailLimpo = email.trim()
  const metaLimpa = meta.trim()

  if (!nomeLimpo) {
    erros.nome = 'Informe o nome.'
  } else if (nomeLimpo.length > 120) {
    erros.nome = 'O nome deve ter no máximo 120 caracteres.'
  }

  if (!emailLimpo) {
    erros.email = 'Informe o e-mail.'
  } else if (!FORMATO_EMAIL.test(emailLimpo)) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (metaLimpa) {
    const valor = Number(metaLimpa)
    if (!Number.isInteger(valor) || valor < 1) {
      erros.metaEstudoSemanal = 'A meta semanal deve ser de no mínimo 1 hora.'
    } else if (valor > 168) {
      erros.metaEstudoSemanal = 'A meta semanal deve ter no máximo 168 horas.'
    }
  }

  if (objetivo.length > 500) {
    erros.objetivoMotivacao = 'O objetivo deve ter no máximo 500 caracteres.'
  }

  return erros
}

/** Estado vazio do formulario, antes de o perfil carregar. */
const FORMULARIO_VAZIO = { nome: '', email: '', meta: '', objetivo: '' }

/** Campos da API que tem input correspondente nesta tela. */
const CAMPOS_DO_PERFIL = ['nome', 'email', 'metaEstudoSemanal', 'objetivoMotivacao']

/** Rotulo legivel de cada campo, usado na mensagem de erro do topo. */
const ROTULO_DOS_CAMPOS: Record<string, string> = {
  nome: 'nome completo',
  email: 'e-mail',
  metaEstudoSemanal: 'meta de estudo semanal',
  objetivoMotivacao: 'objetivo/motivação',
}

function rotuloDoCampo(campo: string): string {
  return ROTULO_DOS_CAMPOS[campo] ?? campo
}

/** Mensagem do topo quando o salvamento falhou por causa de um ou mais campos. */
function mensagemDeErroDosCampos(campos: string[]): string {
  const rotulos = campos.map(rotuloDoCampo)
  return `Não foi possível salvar. Verifique: ${rotulos.join(', ')}.`
}

/**
 * Gerenciamento de perfil da HU03.
 *
 * <p>Carrega o perfil no montagem, deixa editar os quatro campos e envia o
 * PUT. Os estados de carregamento, sucesso, erro por campo e erro de rede
 * espelham os das demais telas, e um 401 no meio do caminho encerra a
 * sessao igual a area autenticada faz.
 */
function TelaPerfil({ token, onEncerrarSessao, onVoltar }: Props) {
  const [form, setForm] = useState(FORMULARIO_VAZIO)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)

  const [carregando, setCarregando] = useState(true)
  const [erroDeCarga, setErroDeCarga] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  const [enviando, setEnviando] = useState(false)
  const [temFoto, setTemFoto] = useState(false)

  useEffect(() => {
    // `descartado` evita que a resposta de uma requisicao que ja nao
    // interessa escreva no estado (mesmo cuidado da TelaAutenticada).
    let descartado = false

    buscarPerfil(token)
      .then((perfil) => {
        if (descartado) return
        setForm({
          nome: perfil.nome,
          email: perfil.email,
          meta: perfil.metaEstudoSemanal == null ? '' : String(perfil.metaEstudoSemanal),
          objetivo: perfil.objetivoMotivacao ?? '',
        })
        setTemFoto(perfil.temFoto ?? false)
        setErroDeCarga(null)
      })
      .catch((falha: unknown) => {
        if (descartado) return

        if (falha instanceof SessaoEncerrada) {
          onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
          return
        }

        if (falha instanceof ErroDeRede) {
          setErroDeCarga(
            'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
          )
        } else {
          setErroDeCarga('Não foi possível carregar o seu perfil. Tente novamente.')
        }
      })
      .finally(() => {
        if (!descartado) setCarregando(false)
      })

    return () => {
      descartado = true
    }
  }, [token, onEncerrarSessao, tentativa])

  const tentarNovamente = useCallback(() => {
    setErroDeCarga(null)
    setCarregando(true)
    setTentativa((numero) => numero + 1)
  }, [])

  const erroDoCampo = (campo: string) => erros[campo]

  const aplicarErrosDaApi = (errosDaApi: ErroDeCampo[]) => {
    const mapa: Record<string, string> = {}
    let geral: string | null = null

    errosDaApi.forEach((erro) => {
      if (CAMPOS_DO_PERFIL.includes(erro.campo)) {
        mapa[erro.campo] = erro.mensagem
      } else {
        // Campo que nao corresponde a nenhum input (ex.: `corpo`).
        geral = erro.mensagem
      }
    })

    setErros(mapa)

    // Ordem estavel (a mesma da lista de campos) para a mensagem do topo.
    const camposComErro = CAMPOS_DO_PERFIL.filter((campo) => mapa[campo])
    const partes: string[] = []
    if (camposComErro.length > 0) {
      partes.push(mensagemDeErroDosCampos(camposComErro))
    }
    if (geral) {
      partes.push(geral)
    }
    if (partes.length > 0) {
      setMensagem({ tipo: 'erro', texto: partes.join(' ') })
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (enviando || carregando) return

    setMensagem(null)

    const errosLocais = validar(form.nome, form.email, form.meta, form.objetivo)
    setErros(errosLocais)

    if (Object.keys(errosLocais).length > 0) {
      setMensagem({
        tipo: 'erro',
        texto: mensagemDeErroDosCampos(Object.keys(errosLocais)),
      })
      return
    }

    setEnviando(true)

    const metaLimpa = form.meta.trim()
    const dados: AtualizacaoDePerfil = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      metaEstudoSemanal: metaLimpa === '' ? null : Number(metaLimpa),
      objetivoMotivacao: form.objetivo.trim() === '' ? null : form.objetivo.trim(),
    }

    try {
      const perfil: Perfil = await salvarPerfil(token, dados)

      setForm({
        nome: perfil.nome,
        email: perfil.email,
        meta: perfil.metaEstudoSemanal == null ? '' : String(perfil.metaEstudoSemanal),
        objetivo: perfil.objetivoMotivacao ?? '',
      })
      setTemFoto(perfil.temFoto ?? false)
      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso.' })
    } catch (erro) {
      if (erro instanceof SessaoEncerrada) {
        onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
      } else if (erro instanceof ErroDeApi) {
        aplicarErrosDaApi(erro.erros)
        if (erro.erros.length === 0) {
          setMensagem({ tipo: 'erro', texto: 'Não foi possível salvar. Tente novamente.' })
        }
      } else if (erro instanceof ErroDeRede) {
        setMensagem({
          tipo: 'erro',
          texto: 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.',
        })
      } else {
        setMensagem({ tipo: 'erro', texto: 'Não foi possível salvar. Tente novamente.' })
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="tela">
      <Cartao titulo="Meu perfil" descricao="Atualize seus dados e sua meta de estudo.">
        {mensagem && <Notificacao tipo={mensagem.tipo} mensagem={mensagem.texto} onFechar={() => setMensagem(null)} />}

        {erroDeCarga && <Aviso tipo="erro">{erroDeCarga}</Aviso>}

        {carregando && <EstadoCarregando>Carregando seu perfil...</EstadoCarregando>}

        {!carregando && !erroDeCarga && (
          <>
          <FotoPerfilEditor token={token} temFoto={temFoto} onFotoAlterada={setTemFoto} onEncerrarSessao={onEncerrarSessao} disabled={enviando} />
          <form onSubmit={handleSubmit} noValidate>
            <CampoFormulario id="nome" rotulo="Nome completo" erro={erroDoCampo('nome')}>
              <input
                name="nome"
                type="text"
                autoComplete="name"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                disabled={enviando}
                maxLength={120}
                required
              />
            </CampoFormulario>

            <CampoFormulario id="email" rotulo="E-mail" erro={erroDoCampo('email')}>
              <input
                name="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={enviando}
                maxLength={180}
                required
              />
            </CampoFormulario>

            <CampoFormulario
              id="meta"
              rotulo="Meta de estudo semanal (horas)"
              ajuda="Opcional, de 1 a 168 horas por semana."
              erro={erroDoCampo('metaEstudoSemanal')}
            >
              <input
                name="meta"
                type="number"
                min={1}
                max={168}
                step={1}
                inputMode="numeric"
                placeholder="Ex.: 10"
                value={form.meta}
                onChange={(e) => setForm({ ...form, meta: e.target.value })}
                disabled={enviando}
              />
            </CampoFormulario>

            <CampoFormulario
              id="objetivo"
              rotulo="Objetivo / motivação"
              ajuda="Opcional, até 500 caracteres."
              erro={erroDoCampo('objetivoMotivacao')}
            >
              <textarea
                name="objetivo"
                rows={4}
                placeholder="Ex.: passar no concurso da Receita Federal"
                value={form.objetivo}
                onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
                disabled={enviando}
                maxLength={500}
              />
            </CampoFormulario>

            <div className="acoes acoes--em-linha">
              <Botao type="submit" carregando={enviando}>
                {enviando ? 'Salvando...' : 'Salvar alterações'}
              </Botao>
              <Botao type="button" variante="secundario" onClick={onVoltar} disabled={enviando}>
                Voltar
              </Botao>
            </div>
          </form>
          </>
        )}

        {erroDeCarga && (
          <div className="acoes acoes--em-linha">
            <Botao type="button" variante="secundario" onClick={tentarNovamente}>
              Tentar novamente
            </Botao>
            <Botao type="button" variante="secundario" onClick={onVoltar}>
              Voltar
            </Botao>
          </div>
        )}
      </Cartao>
    </main>
  )
}

export default TelaPerfil