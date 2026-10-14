package br.com.romenig.plataforma.autenticacao;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Entrega SMTP configurada por ambiente. Nenhum token e escrito em log. */
@Service
public class NotificadorEmailSmtp implements NotificadorEmail {
    private final ObjectProvider<JavaMailSender> remetentes;
    private final String remetente;

    public NotificadorEmailSmtp(ObjectProvider<JavaMailSender> remetentes,
                                @Value("${plataforma.email.remetente:}") String remetente) {
        this.remetentes = remetentes;
        this.remetente = remetente;
    }

    @Override public void enviarConfirmacao(String destino, String link) {
        enviar(destino, "Confirme seu e-mail na ESTUDA.",
                "Confirme seu e-mail para ativar sua conta:\n\n" + link + "\n\nEste link expira em 24 horas.");
    }

    @Override public void enviarRedefinicaoDeSenha(String destino, String link) {
        enviar(destino, "Redefina sua senha na ESTUDA.",
                "Recebemos um pedido para redefinir sua senha:\n\n" + link + "\n\nEste link expira em 30 minutos. Se não foi você, ignore esta mensagem.");
    }

    private void enviar(String destino, String assunto, String texto) {
        JavaMailSender mail = remetentes.getIfAvailable();
        if (mail == null || remetente.isBlank()) {
            throw new ServicoDeEmailIndisponivelException();
        }
        SimpleMailMessage mensagem = new SimpleMailMessage();
        mensagem.setFrom(remetente);
        mensagem.setTo(destino);
        mensagem.setSubject(assunto);
        mensagem.setText(texto);
        mail.send(mensagem);
    }
}
