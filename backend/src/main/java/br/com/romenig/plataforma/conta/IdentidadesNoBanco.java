package br.com.romenig.plataforma.conta;

import java.util.UUID;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Apaga a identidade em {@code auth.users}. O Supabase remove junto as
 * sessoes e os refresh tokens dela; o access token ainda vivo e recusado
 * pelo registro em {@code identidade_excluida}.
 *
 * <p>Roda na transacao da exclusao: se algo falhar, nada e apagado. O backend
 * nao usa a chave service_role, so a propria conexao com o banco.
 */
@Component
@ConditionalOnProperty(name = "plataforma.identidades.tipo", havingValue = "supabase", matchIfMissing = true)
public class IdentidadesNoBanco implements IdentidadesDoSupabase {

    private final JdbcTemplate jdbc;

    public IdentidadesNoBanco(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void remover(UUID authId) {
        jdbc.update("DELETE FROM auth.users WHERE id = ?", authId);
    }
}
