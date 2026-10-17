import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import Notificacao from './Notificacao'

const arrastar = (alvo: HTMLElement, ate: number) => {
  fireEvent.pointerDown(alvo, { clientY: 100, pointerId: 1 })
  fireEvent.pointerMove(alvo, { clientY: 100 + ate, pointerId: 1 })
  fireEvent.pointerUp(alvo, { clientY: 100 + ate, pointerId: 1 })
}

afterEach(() => vi.useRealTimers())
describe('Notificacao', () => {
  it('sucesso aparece como alerta e fecha sozinho em 3 segundos', () => {
    vi.useFakeTimers(); const fechar = vi.fn()
    render(<Notificacao tipo="sucesso" mensagem="Cronograma gerado e salvo." onFechar={fechar} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Cronograma gerado e salvo.')
    act(() => { vi.advanceTimersByTime(2999) }); expect(fechar).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) }); expect(fechar).toHaveBeenCalledTimes(1)
  })
  it('erro fica ate fechar pelo botao ou Esc', () => {
    vi.useFakeTimers(); const fechar = vi.fn()
    render(<Notificacao tipo="erro" mensagem="Falhou." onFechar={fechar} />)
    act(() => { vi.advanceTimersByTime(30000) }); expect(fechar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Fechar notificação' })); expect(fechar).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(window, { key: 'Escape' }); expect(fechar).toHaveBeenCalledTimes(2)
  })
  it('pausa o tempo com o mouse em cima e aceita link na mensagem', () => {
    vi.useFakeTimers(); const fechar = vi.fn()
    render(<Notificacao tipo="sucesso" mensagem={<>Salvo. <a href="/cronograma">Atualize o cronograma</a></>} onFechar={fechar} />)
    expect(screen.getByRole('link', { name: 'Atualize o cronograma' })).toBeInTheDocument()
    fireEvent.mouseEnter(screen.getByRole('alert'))
    act(() => { vi.advanceTimersByTime(10000) }); expect(fechar).not.toHaveBeenCalled()
    fireEvent.mouseLeave(screen.getByRole('alert'))
    act(() => { vi.advanceTimersByTime(3000) }); expect(fechar).toHaveBeenCalledTimes(1)
  })
  it('arrastar para baixo fecha; arraste curto volta ao lugar', () => {
    const fechar = vi.fn()
    render(<Notificacao tipo="erro" mensagem="Falhou." onFechar={fechar} />)
    const alerta = screen.getByRole('alert')
    arrastar(alerta, 30); expect(fechar).not.toHaveBeenCalled(); expect(alerta).not.toHaveClass('notificacao--arrastando')
    arrastar(alerta, 80); expect(fechar).toHaveBeenCalledTimes(1)
    // Gesto rapido: solta sem nenhum movimento intermediario registrado.
    fireEvent.pointerDown(alerta, { clientY: 100, pointerId: 1 }); fireEvent.pointerUp(alerta, { clientY: 200, pointerId: 1 })
    expect(fechar).toHaveBeenCalledTimes(2)
  })
})
