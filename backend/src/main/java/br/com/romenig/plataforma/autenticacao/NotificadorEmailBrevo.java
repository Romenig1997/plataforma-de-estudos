package br.com.romenig.plataforma.autenticacao;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

/** Entrega HTTPS para ambientes que bloqueiam SMTP. Nao registra tokens ou credenciais. */
@Service
@ConditionalOnProperty(name = "plataforma.email.transporte", havingValue = "brevo")
public class NotificadorEmailBrevo implements NotificadorEmail {
    private static final Logger LOG = LoggerFactory.getLogger(NotificadorEmailBrevo.class);
    private final HttpClient cliente;
    private final ObjectMapper json;
    private final String chave;
    private final String remetente;
    private final URI endpoint;
    private final Duration timeout;

    public NotificadorEmailBrevo(ObjectMapper json,
            @Value("${plataforma.email.brevo.chave:}") String chave,
            @Value("${plataforma.email.remetente:}") String remetente,
            @Value("${plataforma.email.brevo.url:https://api.brevo.com/v3/smtp/email}") String url,
            @Value("${plataforma.email.brevo.timeout:10s}") Duration timeout) {
        this.json = json;
        this.chave = chave;
        this.remetente = remetente;
        this.endpoint = URI.create(url);
        this.timeout = timeout;
        this.cliente = HttpClient.newBuilder().connectTimeout(timeout).build();
    }

    @Override public void enviarConfirmacao(String destino, String link) {
        enviar(destino, "Confirme seu e-mail na ESTUDA.",
                "Confirme seu e-mail para ativar sua conta:\n\n" + link + "\n\nEste link expira em 24 horas.");
    }

    @Override public void enviarRedefinicaoDeSenha(String destino, String link) {
        enviar(destino, "Redefina sua senha na ESTUDA.",
                "Recebemos um pedido para redefinir sua senha:\n\n" + link
                        + "\n\nEste link expira em 30 minutos. Se não foi você, ignore esta mensagem.");
    }

    private void enviar(String destino, String assunto, String texto) {
        if (chave.isBlank() || remetente.isBlank()) throw new ServicoDeEmailIndisponivelException();
        String corpo = json.writeValueAsString(Map.of(
                "sender", Map.of("email", remetente, "name", "ESTUDA."),
                "to", List.of(Map.of("email", destino)),
                "subject", assunto, "textContent", texto));
        HttpRequest requisicao = HttpRequest.newBuilder(endpoint).timeout(timeout)
                .header("api-key", chave).header("Content-Type", "application/json")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(corpo)).build();
        try {
            var resposta = cliente.send(requisicao, HttpResponse.BodyHandlers.discarding());
            if (resposta.statusCode() != 201) {
                LOG.warn("Brevo recusou o envio de e-mail (HTTP {}).", resposta.statusCode());
                throw new ServicoDeEmailIndisponivelException();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ServicoDeEmailIndisponivelException();
        } catch (IOException e) {
            LOG.warn("Falha de conexao com o servico de e-mail ({}).", e.getClass().getSimpleName());
            throw new ServicoDeEmailIndisponivelException();
        }
    }
}
