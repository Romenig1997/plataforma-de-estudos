package br.com.romenig.plataforma.usuario.exception;

/**
 * Lancada quando o e-mail informado no cadastro ja pertence a um usuario.
 * Traduzida em HTTP 409 por {@code TratadorDeErros}.
 */
public class EmailJaCadastradoException extends RuntimeException {

    public EmailJaCadastradoException() {
        super("Ja existe um usuario cadastrado com este e-mail.");
    }
}