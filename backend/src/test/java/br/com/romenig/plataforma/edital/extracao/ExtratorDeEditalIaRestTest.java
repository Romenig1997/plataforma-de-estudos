package br.com.romenig.plataforma.edital.extracao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import br.com.romenig.plataforma.edital.exception.FalhaNaExtracaoException;

class ExtratorDeEditalIaRestTest {
    private FalhaNaExtracaoException falha(int status, String corpo) throws Exception {
        HttpServer servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/", troca -> {
            troca.getRequestBody().readAllBytes();
            byte[] bytes = corpo.getBytes(StandardCharsets.UTF_8);
            troca.getResponseHeaders().set("Content-Type", "application/json");
            troca.sendResponseHeaders(status, bytes.length);
            try (var saida = troca.getResponseBody()) { saida.write(bytes); }
        });
        servidor.start();
        try {
            var extrator = new ExtratorDeEditalIaRest("http://127.0.0.1:" + servidor.getAddress().getPort(),
                    "modelo-teste", "chave-teste", new ObjectMapper());
            return assertThrows(FalhaNaExtracaoException.class, () -> extrator.extrair(List.of("Texto do edital")));
        } finally {
            servidor.stop(0);
        }
    }

    @Test
    void distingueCotaEsgotadaDeLimiteTemporario() throws Exception {
        var erro = falha(429, """
                {"error":{"code":"credit_balance_exhausted","type":"insufficient_quota","message":"segredo-do-provedor"}}
                """);
        assertThat(erro.getMessage()).contains("sem saldo ou cota").doesNotContain("segredo-do-provedor");
        assertThat(falha(429, "{\"error\":{\"code\":\"rate_limit_exceeded\"}}").getMessage()).contains("limite de requisicoes");
    }

    @Test
    void reconheceCotaNoCodigoETrataCorpoInvalidoSemExporResposta() throws Exception {
        assertThat(falha(429, "{\"error\":{\"code\":\"insufficient_quota\"}}").getMessage()).contains("sem saldo ou cota");
        assertThat(falha(429, "corpo-invalido-secreto").getMessage()).contains("limite de requisicoes").doesNotContain("secreto");
    }

    @Test
    void informaFalhaDeAcessoSemExporCorpoDoProvedor() throws Exception {
        assertThat(falha(401, "segredo-do-provedor").getMessage()).contains("recusou a chave").doesNotContain("segredo");
        assertThat(falha(500, "segredo-do-provedor").getMessage()).contains("HTTP 500").doesNotContain("segredo");
    }
}
