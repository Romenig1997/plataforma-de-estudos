import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { hasError: boolean; mensagem: string }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, mensagem: '' } }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, mensagem: error?.message || 'Erro inesperado na aplicação.' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="tela" role="alert">
          <div className="cartao padrao-erro">
            <h1>Algo deu errado</h1>
            <p className="muted">{this.state.mensagem}</p>
            <button
              type="button"
              className="btn-abrir"
              onClick={() => (window.location.href = '/app')}
            >
              Voltar ao início
            </button>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
