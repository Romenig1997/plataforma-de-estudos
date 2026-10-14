package br.com.romenig.plataforma.autenticacao;

public class TokenContaInvalidoException extends RuntimeException {
    public TokenContaInvalidoException() {
        super("Este link é inválido ou expirou. Solicite um novo link.");
    }
}
