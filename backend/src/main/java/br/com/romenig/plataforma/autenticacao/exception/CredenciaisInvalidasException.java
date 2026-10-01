package br.com.romenig.plataforma.autenticacao.exception;

/**
 * E-mail inexistente ou senha incorreta.
 *
 * <p>Existe uma unica excecao para os dois casos de proposito: responder
 * "e-mail nao encontrado" revelaria quais contas existem na plataforma,
 * permitindo que um ataque descubra alvos validos antes de tentar senhas.
 * O frontend recebe a mesma mensagem nos dois casos e a exibe no formulario.
 */
public class CredenciaisInvalidasException extends RuntimeException {

    public CredenciaisInvalidasException() {
        super("E-mail ou senha invalidos.");
    }
}