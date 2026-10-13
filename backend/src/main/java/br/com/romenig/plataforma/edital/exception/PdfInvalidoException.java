package br.com.romenig.plataforma.edital.exception;

/**
 * O PDF enviado nao e valido como documento (nao comeca com {@code %PDF} ou o
 * PDFBox nao consegue abrir), ou estoura o limite de upload. Vira 400 com o
 * campo {@code arquivo}.
 */
public class PdfInvalidoException extends RuntimeException {

    public PdfInvalidoException() {
        super("O arquivo enviado nao e um PDF valido.");
    }

    public PdfInvalidoException(String mensagem) {
        super(mensagem);
    }
}