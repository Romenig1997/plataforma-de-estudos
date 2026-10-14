package br.com.romenig.plataforma.autenticacao;

/** O ambiente nao recebeu a configuracao SMTP necessaria para enviar um link. */
public class ServicoDeEmailIndisponivelException extends RuntimeException {
    public ServicoDeEmailIndisponivelException() {
        super("O envio de e-mail está indisponível. Tente novamente mais tarde.");
    }
}
