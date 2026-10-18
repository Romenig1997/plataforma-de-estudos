package br.com.romenig.plataforma;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.jdbc.core.JdbcTemplate;

import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Contas e access tokens no formato do Supabase Auth, para os testes.
 *
 * <p>Nenhum teste fala com o Supabase. Os tokens sao assinados com o segredo
 * HS256 de src/test/resources/application.yml e trazem o mesmo emissor,
 * audiencia e claims que o Supabase Auth emite, entao passam pelo
 * {@code FiltroDeTokenSupabase} exatamente como um token real.
 */
public final class ContasDeTeste {

    public static final String EMISSOR = "https://projeto-de-teste.supabase.co/auth/v1";
    public static final SecretKey CHAVE = Keys.hmacShaKeyFor(
            "segredo-de-teste-sem-valor-real-com-mais-de-32-bytes".getBytes(StandardCharsets.UTF_8));

    private ContasDeTeste() {
    }

    /** Cria o perfil vinculado a uma identidade nova e devolve o access token dela. */
    public static String criar(JdbcTemplate jdbc, String nome, String email, String perfil) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO usuario (nome, email, perfil_id, auth_id, email_verificado)
                VALUES (?, ?, (SELECT id FROM perfil WHERE nome = ?), ?, TRUE)
                """, nome, email, perfil, id);
        return token(id, email, nome);
    }

    public static String criar(JdbcTemplate jdbc, String email, String perfil) {
        return criar(jdbc, "Pessoa de teste", email, perfil);
    }

    public static String aluno(JdbcTemplate jdbc, String email) {
        return criar(jdbc, "Aluno", email, "ALUNO");
    }

    public static String admin(JdbcTemplate jdbc, String email) {
        return criar(jdbc, "Administrador", email, "ADMIN");
    }

    /** Token de uma identidade, exista ou nao o perfil no banco. */
    public static String token(UUID id, String email, String nome) {
        return construtor(id, email, nome).compact();
    }

    /** Ponto de partida para tokens alterados (expirado, outro emissor, outra chave). */
    public static JwtBuilder construtor(UUID id, String email, String nome) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(id.toString())
                .issuer(EMISSOR)
                .audience().add("authenticated").and()
                .claim("email", email)
                .claim("role", "authenticated")
                .claim("user_metadata", nome == null ? Map.of() : Map.of("nome", nome))
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(1, ChronoUnit.HOURS)))
                .signWith(CHAVE);
    }
}
