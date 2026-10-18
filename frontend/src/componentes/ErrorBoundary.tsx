import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { TriangleAlertIcon } from 'lucide-react'
import EstadoDePagina from './EstadoDePagina'
import { Button } from '@/components/ui/button'

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
        <EstadoDePagina
          role="alert"
          titulo="Algo deu errado"
          icone={<TriangleAlertIcon />}
          acoes={
            <>
              <Button type="button" onClick={() => this.setState({ hasError: false })}>Tentar novamente</Button>
              <Button asChild variant="outline"><Link to="/app">Ir para Meus cursos</Link></Button>
            </>
          }
        >
          Não foi possível exibir esta página. Tente novamente ou volte para os seus cursos.
        </EstadoDePagina>
      )
    }
    return this.props.children
  }
}
