package br.com.romenig.plataforma.planner;

public class ErroDePlanoException extends RuntimeException {
    private final String campo;
    public ErroDePlanoException(String campo, String mensagem) { super(mensagem); this.campo = campo; }
    public String getCampo() { return campo; }
}
