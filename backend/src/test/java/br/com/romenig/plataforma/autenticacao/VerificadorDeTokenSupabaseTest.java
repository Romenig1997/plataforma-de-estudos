package br.com.romenig.plataforma.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.interfaces.ECPublicKey;
import java.time.Clock;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import br.com.romenig.plataforma.ContasDeTeste;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;

/**
 * Projetos Supabase com chaves assimetricas assinam os tokens em ES256 e
 * publicam a chave publica no JWKS. Sem rede: o JWKS e servido em memoria.
 */
class VerificadorDeTokenSupabaseTest {

    private static final String URL = "https://projeto-de-teste.supabase.co";
    private final KeyPair par = Jwts.SIG.ES256.keyPair().build();
    private final AtomicInteger leiturasDoJwks = new AtomicInteger();

    private ChavesDeAssinaturaSupabase jwks(String kid) {
        return new ChavesDeAssinaturaSupabase(() -> {
            leiturasDoJwks.incrementAndGet();
            return jwksJson((ECPublicKey) par.getPublic(), kid);
        }, Clock.systemUTC());
    }

    private String tokenEs256(String kid, UUID id) {
        return Jwts.builder()
                .header().keyId(kid).and()
                .subject(id.toString())
                .issuer(URL + "/auth/v1")
                .audience().add("authenticated").and()
                .claim("email", "ana@email.com")
                .claim("user_metadata", Map.of("nome", "Ana Souza"))
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .signWith(par.getPrivate(), Jwts.SIG.ES256)
                .compact();
    }

    @Test
    @DisplayName("aceita ES256 conferido pelo JWKS do projeto e le e-mail e nome")
    void aceitaTokenAssimetrico() {
        var verificador = new VerificadorDeTokenSupabase(URL + "/", "", jwks("chave-es"));
        UUID id = UUID.randomUUID();

        IdentidadeSupabase identidade = verificador.verificar(tokenEs256("chave-es", id));

        assertThat(identidade.id()).isEqualTo(id);
        assertThat(identidade.email()).isEqualTo("ana@email.com");
        assertThat(identidade.nome()).isEqualTo("Ana Souza");
    }

    @Test
    @DisplayName("kid desconhecido e recusado e o JWKS nao e relido a cada requisicao")
    void kidDesconhecidoERecusado() {
        var verificador = new VerificadorDeTokenSupabase(URL, "", jwks("chave-es"));
        String token = tokenEs256("chave-girada", UUID.randomUUID());

        assertThatThrownBy(() -> verificador.verificar(token)).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> verificador.verificar(token)).isInstanceOf(JwtException.class);
        assertThat(leiturasDoJwks.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("sem segredo configurado, token HS256 e recusado (sem troca de algoritmo)")
    void hs256SemSegredoERecusado() {
        var verificador = new VerificadorDeTokenSupabase(URL, "", jwks("chave-es"));
        String hs256 = ContasDeTeste.token(UUID.randomUUID(), "ana@email.com", "Ana");

        assertThatThrownBy(() -> verificador.verificar(hs256)).isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("sem SUPABASE_URL a aplicacao nao sobe")
    void exigeUrlDoProjeto() {
        assertThatThrownBy(() -> new VerificadorDeTokenSupabase(" ", "", jwks("x")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SUPABASE_URL");
    }

    @Test
    @DisplayName("subject que nao e UUID e recusado")
    void subjectInvalido() {
        var verificador = new VerificadorDeTokenSupabase(URL, "segredo-de-teste-sem-valor-real-com-mais-de-32-bytes", jwks("x"));
        String token = ContasDeTeste.construtor(UUID.randomUUID(), "ana@email.com", null).subject("123").compact();

        assertThatThrownBy(() -> verificador.verificar(token)).isInstanceOf(JwtException.class);
    }

    private static String jwksJson(ECPublicKey chave, String kid) {
        return """
                {"keys":[{"kty":"EC","crv":"P-256","alg":"ES256","use":"sig","kid":"%s","x":"%s","y":"%s"}]}
                """.formatted(kid, coordenada(chave.getW().getAffineX()), coordenada(chave.getW().getAffineY()));
    }

    /** Coordenada P-256 em 32 bytes sem sinal, base64url sem padding. */
    private static String coordenada(BigInteger valor) {
        byte[] bytes = valor.toByteArray();
        byte[] fixo = new byte[32];
        int copiar = Math.min(bytes.length, 32);
        System.arraycopy(bytes, bytes.length - copiar, fixo, 32 - copiar, copiar);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(Arrays.copyOf(fixo, 32));
    }
}
