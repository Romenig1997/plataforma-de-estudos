package br.com.romenig.plataforma.edital.exception;

/**
 * O Supabase Storage nao gravou, nao entregou ou nao assinou o PDF do edital
 * (fora do ar, bucket ausente ou politica recusando). Vira 503 no
 * {@code TratadorDeErros}.
 */
public class PdfIndisponivelException extends RuntimeException {

    public PdfIndisponivelException(Throwable causa) {
        super("Nao foi possivel acessar o PDF do edital agora. Tente novamente em instantes.", causa);
    }
}
