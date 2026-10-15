import { Link } from 'react-router-dom'

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
  return (
    <main className="tela">
      <section className="estado-pagina" aria-labelledby="estado-pagina-titulo">
        <span className="sobretitulo">ESTUDA.</span>
        <h1 id="estado-pagina-titulo">{titulo}</h1>
        <p>{mensagem}</p>
        <div className="estado-pagina__acoes">
          {autenticado ? (
            <>
              <Link className="botao-link" to="/app">Ir para Meus cursos</Link>
              <Link className="botao-link botao-link--secundario" to="/dashboard">Ver meu desempenho</Link>
            </>
          ) : (
            <>
              <Link className="botao-link" to="/">Ir para o início</Link>
              <Link className="botao-link botao-link--secundario" to="/login">Entrar</Link>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
