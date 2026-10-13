package br.com.romenig.plataforma.edital.exception;

/**
 * Importacao, PDF ou edital com um id inexistente. Vira 404 com o campo
 * indicado - no lugar de deixar o NullPointer fluir.
 */
public class ImportacaoNaoEncontradaException extends RuntimeException {

    public ImportacaoNaoEncontradaException() {
        super("Importacao nao encontrada.");
    }
}