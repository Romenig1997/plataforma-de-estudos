import { Link } from 'react-router-dom'
import Cartao from './componentes/Cartao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'

type Props = {
  /** Sessao aberta pelo link de confirmacao do Supabase Auth, se houver. */
  token: string | null
  verificando: boolean
  onIrParaLogin: () => void
}

/**
 * Destino do link de confirmacao enviado pelo Supabase Auth. O cliente do
 * Supabase le a sessao da URL; aqui so se mostra o resultado.
 */
export default function TelaConfirmarEmail({ token, verificando, onIrParaLogin }: Props) {
  const erroNaUrl = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description')
    ?? new URLSearchParams(window.location.search).get('error_description')

  return (
    <main className="tela">
      <Cartao titulo="Confirmação de e-mail" descricao="Estamos ativando sua conta.">
        {verificando && <EstadoCarregando>Confirmando seu e-mail…</EstadoCarregando>}
        {!verificando && token && (
          <>
            <Aviso tipo="sucesso">E-mail confirmado. Sua conta está ativa.</Aviso>
            <Link className="botao-link" to="/app">Ir para Meus cursos</Link>
          </>
        )}
        {!verificando && !token && (
          <>
            <Aviso tipo="erro">
              {erroNaUrl
                ? 'Este link de confirmação expirou ou já foi usado. Faça login para receber um novo.'
                : 'Se você já confirmou seu e-mail, faça login para continuar.'}
            </Aviso>
            <Botao type="button" onClick={onIrParaLogin}>Ir para login</Botao>
          </>
        )}
      </Cartao>
    </main>
  )
}
