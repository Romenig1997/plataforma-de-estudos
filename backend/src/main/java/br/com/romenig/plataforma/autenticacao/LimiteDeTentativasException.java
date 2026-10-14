package br.com.romenig.plataforma.autenticacao;

public class LimiteDeTentativasException extends RuntimeException {
    private final long segundosParaTentarNovamente;
    public LimiteDeTentativasException(long segundosParaTentarNovamente) {
        super("Muitas tentativas. Aguarde antes de tentar novamente.");
        this.segundosParaTentarNovamente = segundosParaTentarNovamente;
    }
    public long getSegundosParaTentarNovamente() { return segundosParaTentarNovamente; }
}
