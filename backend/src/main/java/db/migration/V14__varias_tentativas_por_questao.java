package db.migration;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/**
 * Permite refazer questoes: cada resposta passa a ser uma tentativa.
 *
 * <p>A V8 declarou {@code UNIQUE(usuario_id, questao_id)} sem nome explicito,
 * entao o nome gerado difere entre PostgreSQL (Supabase) e H2. Como na V12,
 * a restricao e localizada pelo INFORMATION_SCHEMA e removida. Um indice
 * comum mantem rapida a busca das tentativas do aluno.
 */
public class V14__varias_tentativas_por_questao extends BaseJavaMigration {

    private static final String RESTRICOES_UNICAS = """
            SELECT tc.constraint_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON kcu.constraint_name = tc.constraint_name
               AND kcu.table_name = tc.table_name
             WHERE LOWER(tc.table_name) = 'resposta_questao'
               AND tc.constraint_type = 'UNIQUE'
             GROUP BY tc.constraint_name
            HAVING COUNT(*) = 2
               AND MIN(LOWER(kcu.column_name)) = 'questao_id'
               AND MAX(LOWER(kcu.column_name)) = 'usuario_id'
            """;

    @Override
    public void migrate(Context context) throws Exception {
        Connection conexao = context.getConnection();
        List<String> nomes = new ArrayList<>();
        try (PreparedStatement consulta = conexao.prepareStatement(RESTRICOES_UNICAS);
                ResultSet linhas = consulta.executeQuery()) {
            while (linhas.next()) {
                nomes.add(linhas.getString(1));
            }
        }
        if (nomes.isEmpty()) {
            throw new IllegalStateException("Restricao UNIQUE de resposta_questao (usuario_id, questao_id) nao encontrada.");
        }
        try (Statement comando = conexao.createStatement()) {
            for (String nome : nomes) {
                comando.execute("ALTER TABLE resposta_questao DROP CONSTRAINT \"" + nome.replace("\"", "") + "\"");
            }
            comando.execute("CREATE INDEX idx_resposta_questao_usuario_questao ON resposta_questao (usuario_id, questao_id)");
        }
    }
}
