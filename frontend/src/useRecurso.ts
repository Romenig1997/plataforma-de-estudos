import { useCallback, useEffect, useState } from 'react'
import { mensagemDaFalha } from './api'

export type Recurso<T> = {
  dados: T | null
  definirDados: (dados: T | null) => void
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

/**
 * Carrega um recurso da API com o tratamento padrao das telas: estado de
 * carregamento, mensagem de erro, sessao expirada encerrando a sessao e
 * descarte de respostas que chegam depois de a tela sair.
 *
 * <p>`carregar` deve ser estavel (useCallback ou funcao de modulo).
 */
export function useRecurso<T>(
  carregar: () => Promise<T>,
  onEncerrarSessao: (motivo?: string) => void,
  mensagemPadrao: string,
): Recurso<T> {
  const [dados, definirDados] = useState<T | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    let cancelado = false
    carregar()
      .then((valor) => {
        if (cancelado) return
        definirDados(valor)
        setErro(null)
      })
      .catch((falha: unknown) => {
        if (!cancelado) setErro(mensagemDaFalha(falha, onEncerrarSessao, mensagemPadrao))
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [carregar, onEncerrarSessao, mensagemPadrao, tentativa])

  const recarregar = useCallback(() => {
    setCarregando(true)
    setTentativa((numero) => numero + 1)
  }, [])

  return { dados, definirDados, carregando, erro, recarregar }
}
