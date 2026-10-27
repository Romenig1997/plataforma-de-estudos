package br.com.romenig.plataforma.planner.feriados;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Feriados nacionais pela BrasilAPI ({@code GET /api/feriados/v1/{ano}}),
 * API publica e gratuita, sem chave.
 *
 * <p>Os feriados de um ano nao mudam: a resposta fica em memoria e a API e
 * chamada uma vez por ano por instancia do backend. Se ela falhar, o erro
 * tambem fica guardado por alguns minutos para nao atrasar cada tela do
 * cronograma, e o cronograma segue sem considerar feriados.
 */
@Component
@ConditionalOnProperty(name = "plataforma.feriados.tipo", havingValue = "brasilapi", matchIfMissing = true)
public class FeriadosBrasilApi extends CalendarioDeFeriados {

    private static final Logger LOG = LoggerFactory.getLogger(FeriadosBrasilApi.class);
    private static final Duration ESPERA_APOS_FALHA = Duration.ofMinutes(10);

    private record FeriadoDaApi(String date, String name, String type) {
    }

    private final RestClient http;
    private final Clock relogio;
    private final Map<Integer, List<Feriado>> anos = new ConcurrentHashMap<>();
    private final Map<Integer, Instant> falhas = new ConcurrentHashMap<>();

    public FeriadosBrasilApi(@Value("${plataforma.feriados.url:https://brasilapi.com.br/api/feriados/v1}") String url,
                             Clock relogio) {
        SimpleClientHttpRequestFactory tempos = new SimpleClientHttpRequestFactory();
        tempos.setConnectTimeout(Duration.ofSeconds(3));
        tempos.setReadTimeout(Duration.ofSeconds(5));
        this.http = RestClient.builder().baseUrl(url).requestFactory(tempos).build();
        this.relogio = relogio;
    }

    @Override
    protected Optional<List<Feriado>> doAno(int ano) {
        List<Feriado> guardados = anos.get(ano);
        if (guardados != null) {
            return Optional.of(guardados);
        }
        Instant falhou = falhas.get(ano);
        if (falhou != null && falhou.plus(ESPERA_APOS_FALHA).isAfter(relogio.instant())) {
            return Optional.empty();
        }
        try {
            FeriadoDaApi[] resposta = http.get().uri("/{ano}", ano).retrieve().body(FeriadoDaApi[].class);
            List<Feriado> feriados = Arrays.stream(resposta == null ? new FeriadoDaApi[0] : resposta)
                    .filter(f -> f.date() != null && f.name() != null)
                    .map(f -> new Feriado(LocalDate.parse(f.date()), f.name()))
                    .toList();
            anos.put(ano, feriados);
            falhas.remove(ano);
            return Optional.of(feriados);
        } catch (RestClientException | java.time.format.DateTimeParseException falha) {
            LOG.warn("BrasilAPI indisponivel para os feriados de {}: {}", ano, falha.getMessage());
            falhas.put(ano, relogio.instant());
            return Optional.empty();
        }
    }
}
