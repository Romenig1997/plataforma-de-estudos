package br.com.romenig.plataforma.conta;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Registro das identidades de contas excluidas (tabela {@code identidade_excluida}). */
@Component
public class IdentidadesExcluidas {

    private final JdbcTemplate jdbc;

    public IdentidadesExcluidas(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean contem(UUID authId) {
        Integer total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM identidade_excluida WHERE auth_id = ?", Integer.class, authId);
        return total != null && total > 0;
    }

    void registrar(UUID authId, OffsetDateTime quando) {
        if (!contem(authId)) {
            jdbc.update("INSERT INTO identidade_excluida (auth_id, excluida_em) VALUES (?, ?)", authId, quando);
        }
    }
}
