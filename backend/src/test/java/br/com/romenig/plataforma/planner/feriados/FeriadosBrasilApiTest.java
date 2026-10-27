package br.com.romenig.plataforma.planner.feriados;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.sun.net.httpserver.HttpServer;

/**
 * Cliente da BrasilAPI contra um servidor HTTP local que devolve o mesmo
 * formato da API real ({@code [{"date","name","type"}]}). Nenhuma chamada sai
 * da maquina.
 */
class FeriadosBrasilApiTest {

    private static final String RESPOSTA_2026 = """
            [{"date":"2026-01-01","name":"Confraternização mundial","type":"national"},
             {"date":"2026-11-02","name":"Finados","type":"national"},
             {"date":"2026-12-25","name":"Natal","type":"national"}]""";
    private static final String RESPOSTA_2027 = """
            [{"date":"2027-01-01","name":"Confraternização mundial","type":"national"}]""";

    private HttpServer servidor;
    private final AtomicInteger chamadas = new AtomicInteger();
    private volatile boolean fora = false;

    @BeforeEach
    void subir() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/api/feriados/v1/", troca -> {
            chamadas.incrementAndGet();
            String ano = troca.getRequestURI().getPath().replaceAll(".*/", "");
            byte[] corpo = (ano.equals("2027") ? RESPOSTA_2027 : RESPOSTA_2026).getBytes(StandardCharsets.UTF_8);
            troca.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
            troca.sendResponseHeaders(fora ? 500 : 200, fora ? -1 : corpo.length);
            if (!fora) troca.getResponseBody().write(corpo);
            troca.close();
        });
        servidor.start();
    }

    @AfterEach
    void descer() {
        servidor.stop(0);
    }

    private FeriadosBrasilApi cliente() {
        return new FeriadosBrasilApi("http://127.0.0.1:" + servidor.getAddress().getPort() + "/api/feriados/v1",
                Clock.fixed(Instant.parse("2026-10-27T12:00:00Z"), ZoneOffset.UTC));
    }

    @Test
    void trazOsFeriadosDaSemanaEGuardaOAno() {
        FeriadosBrasilApi api = cliente();

        FeriadosDaSemana semana = api.daSemana(LocalDate.of(2026, 11, 2));
        api.daSemana(LocalDate.of(2026, 12, 21));

        assertThat(semana.disponivel()).isTrue();
        assertThat(semana.feriados()).containsExactly(new Feriado(LocalDate.of(2026, 11, 2), "Finados"));
        assertThat(chamadas.get()).isEqualTo(1);
    }

    @Test
    void semanaDaViradaConsultaOsDoisAnos() {
        FeriadosDaSemana semana = cliente().daSemana(LocalDate.of(2026, 12, 28));

        assertThat(semana.feriados()).extracting(Feriado::nome).containsExactly("Confraternização mundial");
        assertThat(semana.feriados().get(0).data()).isEqualTo(LocalDate.of(2027, 1, 1));
    }

    @Test
    void apiForaDoArDeixaOCalendarioIndisponivelSemErro() {
        fora = true;
        FeriadosBrasilApi api = cliente();

        assertThat(api.daSemana(LocalDate.of(2026, 11, 2)).disponivel()).isFalse();
        // A falha fica guardada por alguns minutos: nao insiste a cada tela.
        api.daSemana(LocalDate.of(2026, 11, 2));
        assertThat(chamadas.get()).isEqualTo(1);
    }
}
