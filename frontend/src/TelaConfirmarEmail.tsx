import { Link } from 'react-router-dom'
import Cartao from './componentes/Cartao'
import Aviso from './componentes/Aviso'
import Botao from './componentes/Botao'
import EstadoCarregando from './componentes/EstadoCarregando'
import { Button } from '@/components/ui/button'

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
    <main className="flex w-full justify-center">
      <Cartao titulo="Confirmação de e-mail" descricao="Estamos ativando sua conta.">
        {verificando && <EstadoCarregando formato="linha">Confirmando seu e-mail…</EstadoCarregando>}
        {!verificando && token && (
          <>
            <Aviso tipo="sucesso">E-mail confirmado. Sua conta está ativa.</Aviso>
            <Button asChild className="w-full"><Link to="/app">Ir para Meus cursos</Link></Button>
          </>
        )}
        {!verificando && !token && (
          <>
            <Aviso tipo="erro">
              {erroNaUrl
                ? 'Este link de confirmação expirou ou já foi usado. Faça login para receber um novo.'
                : 'Se você já confirmou seu e-mail, faça login para continuar.'}
            </Aviso>
            <Botao type="button" onClick={onIrParaLogin} className="w-full">Ir para login</Botao>
          </>
        )}
      </Cartao>
    </main>
  )
}
