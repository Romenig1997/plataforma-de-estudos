package br.com.romenig.plataforma.autenticacao;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Map;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwsHeader;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.LocatorAdapter;
import io.jsonwebtoken.security.Keys;

/**
 * Confere os access tokens emitidos pelo Supabase Auth.
 *
 * <p>O backend nao emite tokens nem confere senhas: so aceita um token se
 *
 * <ul>
 *   <li>a assinatura for do projeto Supabase configurado. Projetos com chaves
 *       assimetricas (ES256/RS256) sao conferidos pelo JWKS publico; projetos
 *       com o segredo legado (HS256) usam {@code SUPABASE_JWT_SECRET};</li>
 *   <li>o emissor for {@code {SUPABASE_URL}/auth/v1} e a audiencia for
 *       {@code authenticated}. Isso recusa a propria chave anon (que tambem e
 *       um JWT) e tokens de outros projetos;</li>
 *   <li>o token nao estiver expirado (tolerancia de 30 segundos de relogio).</li>
 * </ul>
 *
 * <p>Um algoritmo HMAC so e aceito quando o segredo esta configurado, o que
 * impede a troca de algoritmo usando a chave publica como segredo.
 */
@Component
public class VerificadorDeTokenSupabase {

    private static final String AUDIENCIA = "authenticated";

    private final String emissor;
    private final SecretKey segredoLegado;
    private final ChavesDeAssinaturaSupabase chavesPublicas;

    @Autowired
    public VerificadorDeTokenSupabase(@Value("${plataforma.supabase.url}") String urlDoProjeto,
                                      @Value("${plataforma.supabase.jwt-secret:}") String segredo) {
        this(urlDoProjeto, segredo, ChavesDeAssinaturaSupabase.doProjeto(semBarraFinal(urlDoProjeto)));
    }

    VerificadorDeTokenSupabase(String urlDoProjeto, String segredo, ChavesDeAssinaturaSupabase chavesPublicas) {
        if (urlDoProjeto == null || urlDoProjeto.isBlank()) {
            throw new IllegalStateException("Configure SUPABASE_URL com a URL do projeto Supabase.");
        }
        this.emissor = semBarraFinal(urlDoProjeto) + "/auth/v1";
        this.segredoLegado = segredo == null || segredo.isBlank()
                ? null
                : Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));
        this.chavesPublicas = chavesPublicas;
    }

    /**
     * Devolve a identidade do token.
     *
     * @throws JwtException se o token for invalido, expirado ou de outro emissor
     */
    public IdentidadeSupabase verificar(String token) {
        Claims claims = Jwts.parser()
                .keyLocator(new LocatorAdapter<Key>() {
                    @Override
                    protected Key locate(JwsHeader cabecalho) {
                        return chaveDe(cabecalho);
                    }
                })
                .requireIssuer(emissor)
                .requireAudience(AUDIENCIA)
                .clockSkewSeconds(30)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        UUID id;
        try {
            id = UUID.fromString(claims.getSubject());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw new JwtException("Token sem identificador de usuario valido.");
        }
        return new IdentidadeSupabase(id, claims.get("email", String.class), nomeDosMetadados(claims));
    }

    private Key chaveDe(JwsHeader cabecalho) {
        String algoritmo = cabecalho.getAlgorithm();
        Key chave;
        if (algoritmo != null && algoritmo.startsWith("HS")) {
            chave = segredoLegado;
        } else {
            chave = chavesPublicas.chave(cabecalho.getKeyId());
        }
        if (chave == null) {
            throw new JwtException("Chave de assinatura desconhecida para o algoritmo " + algoritmo + ".");
        }
        return chave;
    }

    private static String nomeDosMetadados(Claims claims) {
        Object metadados = claims.get("user_metadata");
        if (!(metadados instanceof Map<?, ?> mapa)) {
            return null;
        }
        for (String campo : new String[] {"nome", "full_name", "name"}) {
            if (mapa.get(campo) instanceof String valor && !valor.isBlank()) {
                return valor.trim();
            }
        }
        return null;
    }

    private static String semBarraFinal(String url) {
        String limpa = url == null ? "" : url.trim();
        return limpa.endsWith("/") ? limpa.substring(0, limpa.length() - 1) : limpa;
    }
}
