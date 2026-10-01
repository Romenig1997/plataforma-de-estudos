package br.com.romenig.plataforma.autenticacao.exception;

/**
 * Token valido cujo usuario nao existe mais no banco - por exemplo, uma conta
 * removida entre a emissao do token e o uso.
 *
 * <p>Responde 401 para que o frontend trate o caso igual a um token expirado:
 * encerra a sessao e volta para a tela de login.
 */
public class SessaoInvalidaException extends RuntimeException {

    public SessaoInvalidaException() {
        super("Sessao invalida. Faca login novamente.");
    }
}