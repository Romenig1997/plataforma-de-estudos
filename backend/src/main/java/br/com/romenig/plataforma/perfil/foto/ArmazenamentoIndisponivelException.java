package br.com.romenig.plataforma.perfil.foto;

/** O Supabase Storage nao gravou a foto. Vira 503 no {@code TratadorDeErros}. */
public class ArmazenamentoIndisponivelException extends RuntimeException {

    public ArmazenamentoIndisponivelException(Throwable causa) {
        super("Não foi possível salvar a foto agora. Tente novamente em instantes.", causa);
    }
}
