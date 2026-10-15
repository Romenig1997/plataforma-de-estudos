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
 * Libera mais de um plano por aluno (um por curso inscrito).
 *
 * <p>A V5 declarou {@code usuario_id UNIQUE} na coluna, sem nome explicito: o
 * PostgreSQL (Supabase) gera {@code plano_estudo_usuario_id_key} e o H2 dos
 * testes gera um nome aleatorio. Por isso esta migration e em Java: procura no
 * INFORMATION_SCHEMA a restricao UNIQUE formada apenas por {@code usuario_id}
 * e a remove, funcionando nos dois bancos. A nova unicidade
 * (usuario, edital) entra na V13.
 */
public class V12__plano_por_curso extends BaseJavaMigration {

    private static final String RESTRICOES_UNICAS = """
            SELECT tc.constraint_name
              FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu
                ON kcu.constraint_name = tc.constraint_name
               AND kcu.table_name = tc.table_name
             WHERE LOWER(tc.table_name) = 'plano_estudo'
               AND tc.constraint_type = 'UNIQUE'
             GROUP BY tc.constraint_name
            HAVING COUNT(*) = 1 AND MAX(LOWER(kcu.column_name)) = 'usuario_id'
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
            throw new IllegalStateException("Restricao UNIQUE de plano_estudo.usuario_id nao encontrada.");
        }
        try (Statement comando = conexao.createStatement()) {
            for (String nome : nomes) {
                comando.execute("ALTER TABLE plano_estudo DROP CONSTRAINT \"" + nome.replace("\"", "") + "\"");
            }
        }
    }
}
