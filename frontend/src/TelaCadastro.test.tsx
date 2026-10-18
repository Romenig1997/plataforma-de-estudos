import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TelaCadastro from './TelaCadastro'
import { ErroDeAutenticacao } from './autenticacao'
import { instalarFetch, respostaJson } from './testes/ajuda'

const { cadastrar, sair } = vi.hoisted(() => ({ cadastrar: vi.fn(), sair: vi.fn() }))

vi.mock('./autenticacao', async (original) => ({
  ...(await original<typeof import('./autenticacao')>()),
  cadastrar,
  sair,
}))

/** Criterios de aceite do cadastro de candidato (HU01) com o Supabase Auth. */
describe('TelaCadastro', () => {
  beforeEach(() => {
    cadastrar.mockReset()
    sair.mockReset().mockResolvedValue(undefined)
  })

  async function preencher(nome: string, email: string, senha: string) {
    const usuario = userEvent.setup()
    if (nome) await usuario.type(screen.getByLabelText('Nome completo'), nome)
    if (email) await usuario.type(screen.getByLabelText('E-mail'), email)
    if (senha) await usuario.type(screen.getByLabelText('Senha'), senha)
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar' }))
  }

  it('exige nome, e-mail e senha, marcando cada campo invalido', async () => {
    render(<TelaCadastro onIrParaLogin={vi.fn()} onAutenticado={vi.fn()} />)
    await preencher('', '', '')

    expect(await screen.findByText('Informe seu nome.')).toBeInTheDocument()
    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe uma senha.')).toBeInTheDocument()
    expect(screen.getByLabelText('Nome completo')).toHaveAttribute('aria-invalid', 'true')
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('recusa senha com menos de 8 caracteres e e-mail invalido antes de enviar', async () => {
    render(<TelaCadastro onIrParaLogin={vi.fn()} onAutenticado={vi.fn()} />)
    await preencher('Ana', 'ana@', '1234567')

    expect(await screen.findByText('A senha deve ter pelo menos 8 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toHaveAttribute('aria-invalid', 'true')
    expect(cadastrar).not.toHaveBeenCalled()
  })

  it('cria a conta e pede a confirmacao do e-mail', async () => {
    cadastrar.mockResolvedValue({ sessao: 'confirmar-email' })
    render(<TelaCadastro onIrParaLogin={vi.fn()} onAutenticado={vi.fn()} />)
    await preencher('  Ana Souza ', 'Ana@Email.com', 'senha1234')

    expect(cadastrar).toHaveBeenCalledWith('Ana Souza', 'ana@email.com', 'senha1234')
    expect(await screen.findByText(/Confira seu e-mail/)).toBeInTheDocument()
    expect(screen.getByLabelText('Nome completo')).toHaveValue('')
  })

  it('e-mail duplicado aparece no campo de e-mail', async () => {
    cadastrar.mockRejectedValue(new ErroDeAutenticacao('Já existe uma conta com este e-mail.', 'email', 'user_already_exists'))
    render(<TelaCadastro onIrParaLogin={vi.fn()} onAutenticado={vi.fn()} />)
    await preencher('Ana', 'ana@email.com', 'senha1234')

    expect(await screen.findByText('Já existe uma conta com este e-mail.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('aria-invalid', 'true')
  })

  it('sem confirmacao de e-mail no projeto, entra direto com o perfil ALUNO', async () => {
    cadastrar.mockResolvedValue({ sessao: 'iniciada', token: 'tok' })
    const perfil = { id: 3, nome: 'Ana', email: 'ana@email.com', perfil: 'ALUNO', avatarUrl: null }
    instalarFetch(() => respostaJson(200, perfil))
    const onAutenticado = vi.fn()

    render(<TelaCadastro onIrParaLogin={vi.fn()} onAutenticado={onAutenticado} />)
    await preencher('Ana', 'ana@email.com', 'senha1234')

    await vi.waitFor(() => expect(onAutenticado).toHaveBeenCalledWith('tok', perfil))
  })
})
