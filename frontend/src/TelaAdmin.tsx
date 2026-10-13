import { useCallback, useEffect, useState } from 'react'
import { listarUsuarios, type UsuarioAdmin } from './admin'
import { ErroDeApi, ErroDeRede, SessaoEncerrada } from './sessao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import Cartao from './componentes/Cartao'
import EstadoCarregando from './componentes/EstadoCarregando'
import EstadoVazio from './componentes/EstadoVazio'
import Tabela from './componentes/Tabela'

type Props = {
  token: string
  /** Volta para a area autenticada (HU02), sem sair da sessao. */
  onVoltar: () => void
  /** Abre a importacao de editais (HU07) - existe so para quem tem esta tela. */
  onIrParaEditais: () => void
  /** Encerra a sessao quando o token expira no meio do uso da tela. */
  onEncerrarSessao: (motivo?: string) => void
}

function mensagemDeFalha(falha: unknown): string {
  if (falha instanceof ErroDeRede) {
    return 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.'
  }

  if (falha instanceof ErroDeApi) {
    // O 403 vem com o campo `autorizacao` preenchido pelo backend.
    const mensagem = falha.mensagemDoCampo('autorizacao')
    if (mensagem) return mensagem
  }

  return 'Não foi possível carregar a lista de usuários. Tente novamente.'
}

/**
 * Area admin da HU04: a tela restrita que so ADMIN ve.
 *
 * <p>A existencia do botao ja e decidida na TelaAutenticada pelo perfil do
 * usuario. Esta tela trata o caso do acesso forcado (rota chamada sem ser
 * ADMIN): o 403 chega como `ErroDeApi` com o campo `autorizacao` e e
 * mostrado sem encerrar a sessao.
 */
function TelaAdmin({ token, onVoltar, onIrParaEditais, onEncerrarSessao }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    // `descartado` evita que a resposta de uma requisicao que ja nao
    // interessa escreva no estado (mesmo cuidado da TelaAutenticada).
    let descartado = false

    listarUsuarios(token)
      .then((lista) => {
        if (!descartado) setUsuarios(lista)
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
    setUsuarios(null)
    setErro(null)
    setCarregando(true)
    setTentativa((numero) => numero + 1)
  }, [])

  return (
    <main className="tela">
      <Cartao largo titulo="Área admin" descricao="Usuários cadastrados na plataforma.">
        {erro && <Aviso tipo="erro">{erro}</Aviso>}

        {carregando && <EstadoCarregando>Carregando usuários...</EstadoCarregando>}

        {!carregando && !erro && usuarios && usuarios.length === 0 && (
          <EstadoVazio>Nenhum usuário cadastrado.</EstadoVazio>
        )}

        {!carregando && !erro && usuarios && usuarios.length > 0 && (
          <Tabela>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">E-mail</th>
                <th scope="col">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id}>
                  <td>{usuario.nome}</td>
                  <td>{usuario.email}</td>
                  <td>{usuario.perfil}</td>
                </tr>
              ))}
            </tbody>
          </Tabela>
        )}

        <div className="acoes acoes--em-linha">
          <Botao type="button" variante="secundario" onClick={onIrParaEditais}>
            Importar editais
          </Botao>
          {erro && (
            <Botao type="button" variante="secundario" onClick={tentarNovamente}>
              Tentar novamente
            </Botao>
          )}
          <Botao type="button" variante="secundario" onClick={onVoltar}>
            Voltar
          </Botao>
        </div>
      </Cartao>
    </main>
  )
}

export default TelaAdmin