package br.com.romenig.plataforma.edital.exception;

/**
 * A extracao via IA falhou (rede, provedor, JSON invalido). A importacao nao
 * e interrompida: ela fica em {@code FALHA} e o PDF salvo permite reprocessar.
 */
public class FalhaNaExtracaoException extends RuntimeException {

    public FalhaNaExtracaoException(String mensagem) {
        super(mensagem);
    }

    public FalhaNaExtracaoException(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }
}