package br.com.romenig.plataforma.autenticacao;

/** Porta de entrega de e-mails. Mantem o dominio independente do SMTP usado. */
public interface NotificadorEmail {
    void enviarConfirmacao(String destino, String link);
    void enviarRedefinicaoDeSenha(String destino, String link);
}
