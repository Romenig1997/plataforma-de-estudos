import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { buscarSessaoAtual, ErroDeRede, SessaoEncerrada, type Usuario } from './sessao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import Cartao from './componentes/Cartao'
import EstadoCarregando from './componentes/EstadoCarregando'

type Props = {
  token: string
  /**
   * Encerra a sessao no App. `motivo` preenchido aparece na tela de login, para
   * que a pessoa entenda por que voltou para ca.
   */
  onEncerrarSessao: (motivo?: string) => void
}

function mensagemDeFalha(falha: unknown): string {
  if (falha instanceof ErroDeRede) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
  }
  return 'Não foi possível carregar os seus dados. Tente novamente.'
}

/**
 * Area autenticada da HU02.
 *
 * <p>E o minimo necessario para validar o criterio de aceite da HU: mostrar
 * quem entrou, ter um botao que encerra a sessao e ler um recurso protegido
 * da API. Nao ha dashboard aqui - isso e a HU08.
 *
 * <p>A leitura de `/api/auth/me` e o que prova, no navegador, que o token
 * realmente protege algo: sem ele na resposta, a tela cairia no tratamento de
 * sessao encerrada.
 *
 * <p>Desde a HU04, quem tem perfil `ADMIN` ve o botao "Área admin". As telas
 * de perfil (HU02/HU03) e admin (HU04) sao rotas proprias desde a HU06: os
 * botoes navegam (`/perfil`, `/admin`) em vez de trocar de componente por
 * estado.
 */
function TelaAutenticada({ token, onEncerrarSessao }: Props) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    // `descartado` evita que a resposta de uma requisicao que ja nao
    // interessa escreva no estado - o que aconteceria ao tentar de novo ou ao
    // desmontar a tela no meio do carregamento.
    let descartado = false

    buscarSessaoAtual(token)
      .then((dados) => {
        if (!descartado) setUsuario(dados)
      })
      .catch((falha: unknown) => {
        if (descartado) return

        if (falha instanceof SessaoEncerrada) {
          onEncerrarSessao('Sua sessão expirou. Faça login novamente.')
          return
        }

        setErro(mensagemDeFalha(falha))
      })
      .finally(() => {
        if (!descartado) setCarregando(false)
      })

    return () => {
      descartado = true
    }
  }, [token, onEncerrarSessao, tentativa])

  const tentarNovamente = useCallback(() => {
    setErro(null)
    setCarregando(true)
    setTentativa((numero) => numero + 1)
  }, [])

  return (
    <main className="tela tela-inicio">
      <Cartao titulo="Área autenticada" descricao="Sessão ativa. Acesse seu planejamento e acompanhe os estudos.">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {carregando && <EstadoCarregando>Carregando seus dados...</EstadoCarregando>}

        {usuario && (
          <div className="inicio-boas-vindas"><span className="sobretitulo">SEU FUTURO COMEÇA AQUI</span><h2>Vamos mais longe,<br /><strong>{usuario.nome.split(' ')[0]}.</strong></h2><p>Transforme seus objetivos em uma rotina de conquistas. Seu próximo passo está logo abaixo.</p></div>
        )}
        {usuario && (
          <dl className="dados-sessao">
            <dt>Nome</dt>
            <dd>{usuario.nome}</dd>
            <dt>E-mail</dt>
            <dd>{usuario.email}</dd>
          </dl>
        )}

        <div className="acoes acoes--em-linha">
          {usuario && <Botao type="button" variante="secundario" onClick={() => navigate('/questoes')} disabled={carregando}>Responder questões</Botao>}
          {usuario && <Botao type="button" variante="secundario" onClick={() => navigate('/analise')} disabled={carregando}>Análise de desempenho</Botao>}
          {usuario && <Botao type="button" variante="secundario" onClick={() => navigate('/dashboard')} disabled={carregando}>Dashboard de estudos</Botao>}
          {usuario && <Botao type="button" variante="secundario" onClick={() => navigate('/planner')} disabled={carregando}>Planner de estudos</Botao>}
          {usuario && <Botao type="button" variante="secundario" onClick={() => navigate('/cronograma')} disabled={carregando}>Cronograma de estudos</Botao>}
          {erro && (
            <Botao type="button" variante="secundario" onClick={tentarNovamente}>
              Tentar novamente
            </Botao>
          )}
          {usuario && usuario.perfil === 'ADMIN' && (
            <Botao type="button" variante="secundario" onClick={() => navigate('/admin')} disabled={carregando}>
              Área admin
            </Botao>
          )}
          <Botao type="button" variante="secundario" onClick={() => navigate('/perfil')} disabled={carregando}>
            Editar perfil
          </Botao>
          <Botao type="button" onClick={() => onEncerrarSessao()} disabled={carregando}>
            Sair
          </Botao>
        </div>
      </Cartao>
    </main>
  )
}

export default TelaAutenticada
