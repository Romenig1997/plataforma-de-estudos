import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

type Props = {
  children: ReactNode
  /** Quando muda (ex.: a rota atual), a tela de erro e descartada. */
  chave?: string
}

type State = { hasError: boolean }

/**
 * Captura falhas de renderizacao dentro do layout, sem derrubar a navegacao.
 * O detalhe tecnico vai para o console; o aluno ve uma mensagem amigavel.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  componentDidUpdate(anteriores: Props) {
    if (this.state.hasError && anteriores.chave !== this.props.chave) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="tela" role="alert">
          <section className="estado-pagina">
            <h1>Algo deu errado</h1>
            <p>Não foi possível exibir esta página. Tente novamente ou volte para os seus cursos.</p>
            <div className="estado-pagina__acoes">
              <button type="button" className="botao-link" onClick={() => this.setState({ hasError: false })}>
                Tentar novamente
              </button>
              <Link className="botao-link botao-link--secundario" to="/app">
                Ir para Meus cursos
              </Link>
            </div>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}
