package br.com.romenig.plataforma.autenticacao;

/** Credenciais corretas, mas a conta ainda nao ativou o endereco de e-mail. */
public class EmailNaoConfirmadoException extends RuntimeException {
    public EmailNaoConfirmadoException() {
        super("Confirme seu e-mail para acessar a plataforma.");
    }
}
