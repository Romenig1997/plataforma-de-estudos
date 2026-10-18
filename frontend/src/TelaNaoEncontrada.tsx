import { Link } from 'react-router-dom'
import { CompassIcon, LockKeyholeIcon } from 'lucide-react'
import EstadoDePagina from './componentes/EstadoDePagina'
import { Button } from '@/components/ui/button'

type Props = {
  autenticado: boolean
  titulo?: string
  mensagem?: string
}

/**
 * Pagina exibida para um endereco que nao existe (ou que a conta nao pode
 * abrir), com caminhos claros de volta em vez de um redirecionamento mudo.
 */
export default function TelaNaoEncontrada({
  autenticado,
  titulo = 'Página não encontrada',
  mensagem = 'O endereço que você tentou abrir não existe ou foi movido.',
}: Props) {
  const negado = titulo === 'Acesso negado'
  return (
    <EstadoDePagina
      sobretitulo="ESTUDA."
      titulo={titulo}
      icone={negado ? <LockKeyholeIcon /> : <CompassIcon />}
      acoes={
        autenticado ? (
          <>
            <Button asChild><Link to="/app">Ir para Meus cursos</Link></Button>
            <Button asChild variant="outline"><Link to="/dashboard">Ver meu desempenho</Link></Button>
          </>
        ) : (
          <>
            <Button asChild><Link to="/">Ir para o início</Link></Button>
            <Button asChild variant="outline"><Link to="/login">Entrar</Link></Button>
          </>
        )
      }
    >
      {mensagem}
    </EstadoDePagina>
  )
}
