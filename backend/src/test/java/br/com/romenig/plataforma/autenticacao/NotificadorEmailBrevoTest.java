package br.com.romenig.plataforma.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

class NotificadorEmailBrevoTest {
    private HttpServer servidor;
    private final ObjectMapper json = new ObjectMapper();
    private final AtomicReference<String> corpo = new AtomicReference<>();
    private final AtomicReference<String> chave = new AtomicReference<>();
    private volatile int status = 201;
    private volatile boolean responder = true;

    @BeforeEach void iniciar() throws Exception {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/smtp/email", troca -> {
            corpo.set(new String(troca.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            chave.set(troca.getRequestHeaders().getFirst("api-key"));
            if (responder) {
                troca.sendResponseHeaders(status, -1);
                troca.close();
            }
        });
        servidor.start();
    }

    @AfterEach void parar() { servidor.stop(0); }

    private NotificadorEmailBrevo notificador(Duration timeout) {
        return new NotificadorEmailBrevo(json, "chave-de-teste", "contato@example.com",
                "http://127.0.0.1:" + servidor.getAddress().getPort() + "/smtp/email", timeout);
    }

    @Test void enviaConfirmacaoPeloContratoHttpsDoBrevo() {
        notificador(Duration.ofSeconds(2)).enviarConfirmacao("ana@example.com", "https://estuda.example/confirmar?token=teste");
        var payload = json.readTree(corpo.get());
        assertThat(chave.get()).isEqualTo("chave-de-teste");
        assertThat(payload.at("/sender/email").asString()).isEqualTo("contato@example.com");
        assertThat(payload.at("/to/0/email").asString()).isEqualTo("ana@example.com");
        assertThat(payload.get("textContent").asString()).contains("https://estuda.example/confirmar?token=teste");
    }

    @Test void enviaLinkDeRedefinicaoSemTrocarODestino() {
        notificador(Duration.ofSeconds(2)).enviarRedefinicaoDeSenha("ana@example.com", "https://estuda.example/redefinir?token=teste");
        assertThat(json.readTree(corpo.get()).get("textContent").asString())
                .contains("https://estuda.example/redefinir?token=teste", "30 minutos");
    }

    @Test void traduzRecusaDoProvedorSemExporCredenciais() {
        status = 401;
        assertThatThrownBy(() -> notificador(Duration.ofSeconds(2)).enviarConfirmacao("ana@example.com", "link"))
                .isInstanceOf(ServicoDeEmailIndisponivelException.class)
                .hasMessageNotContaining("chave-de-teste");
    }

    @Test void interrompeEsperaQuandoProvedorNaoResponde() {
        responder = false;
        long inicio = System.nanoTime();
        assertThatThrownBy(() -> notificador(Duration.ofMillis(200)).enviarConfirmacao("ana@example.com", "link"))
                .isInstanceOf(ServicoDeEmailIndisponivelException.class);
        assertThat(Duration.ofNanos(System.nanoTime() - inicio)).isLessThan(Duration.ofSeconds(3));
    }

    @Test void rejeitaChaveAusenteAntesDeEnviar() {
        var semChave = new NotificadorEmailBrevo(json, "", "contato@example.com",
                "http://127.0.0.1:" + servidor.getAddress().getPort() + "/smtp/email", Duration.ofSeconds(1));
        assertThatThrownBy(() -> semChave.enviarConfirmacao("ana@example.com", "link"))
                .isInstanceOf(ServicoDeEmailIndisponivelException.class);
        assertThat(corpo.get()).isNull();
    }
}
