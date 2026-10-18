package br.com.romenig.plataforma.autenticacao;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Key;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import io.jsonwebtoken.security.Jwk;
import io.jsonwebtoken.security.JwkSet;
import io.jsonwebtoken.security.Jwks;

/**
 * Chaves publicas que o Supabase Auth usa para assinar os access tokens
 * (ES256/RS256), lidas do endpoint JWKS do projeto.
 *
 * <p>As chaves ficam em cache. Um {@code kid} desconhecido provoca uma nova
 * leitura, no maximo uma vez por minuto, o que cobre a rotacao de chaves feita
 * no painel do Supabase sem reiniciar o backend.
 */
class ChavesDeAssinaturaSupabase {

    private static final Logger LOG = LoggerFactory.getLogger(ChavesDeAssinaturaSupabase.class);
    private static final Duration VALIDADE_DO_CACHE = Duration.ofMinutes(10);
    private static final Duration INTERVALO_MINIMO_ENTRE_LEITURAS = Duration.ofMinutes(1);

    private final Supplier<String> leitorDoJwks;
    private final Clock relogio;
    private final Map<String, Key> chaves = new ConcurrentHashMap<>();
    private volatile Instant ultimaLeitura = Instant.EPOCH;

    ChavesDeAssinaturaSupabase(Supplier<String> leitorDoJwks, Clock relogio) {
        this.leitorDoJwks = leitorDoJwks;
        this.relogio = relogio;
    }

    /** Leitura real: {@code GET {SUPABASE_URL}/auth/v1/.well-known/jwks.json}. */
    static ChavesDeAssinaturaSupabase doProjeto(String urlDoProjeto) {
        HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
        URI endereco = URI.create(urlDoProjeto + "/auth/v1/.well-known/jwks.json");
        return new ChavesDeAssinaturaSupabase(() -> {
            try {
                HttpResponse<String> resposta = http.send(
                        HttpRequest.newBuilder(endereco).timeout(Duration.ofSeconds(5)).GET().build(),
                        HttpResponse.BodyHandlers.ofString());
                if (resposta.statusCode() != 200) {
                    throw new IllegalStateException("JWKS do Supabase respondeu HTTP " + resposta.statusCode());
                }
                return resposta.body();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Leitura do JWKS interrompida", e);
            } catch (java.io.IOException e) {
                throw new IllegalStateException("Nao foi possivel ler o JWKS do Supabase", e);
            }
        }, Clock.systemUTC());
    }

    /** Chave publica do {@code kid}, ou {@code null} se o Supabase nao a publica. */
    Key chave(String kid) {
        if (kid == null) {
            return null;
        }
        Instant agora = relogio.instant();
        boolean cacheVencido = agora.isAfter(ultimaLeitura.plus(VALIDADE_DO_CACHE));
        boolean podeReler = agora.isAfter(ultimaLeitura.plus(INTERVALO_MINIMO_ENTRE_LEITURAS));
        if (cacheVencido || (!chaves.containsKey(kid) && podeReler)) {
            recarregar(agora);
        }
        return chaves.get(kid);
    }

    private synchronized void recarregar(Instant agora) {
        ultimaLeitura = agora;
        try {
            JwkSet conjunto = Jwks.setParser().build().parse(leitorDoJwks.get());
            Map<String, Key> novas = new ConcurrentHashMap<>();
            for (Jwk<?> jwk : conjunto.getKeys()) {
                if (jwk.getId() != null) {
                    novas.put(jwk.getId(), jwk.toKey());
                }
            }
            chaves.clear();
            chaves.putAll(novas);
        } catch (RuntimeException e) {
            // Mantem as chaves anteriores: uma falha de rede passageira nao
            // derruba sessoes cujas chaves ja eram conhecidas.
            LOG.warn("Falha ao atualizar as chaves de assinatura do Supabase: {}", e.getMessage());
        }
    }
}
