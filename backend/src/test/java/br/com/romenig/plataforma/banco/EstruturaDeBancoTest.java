package br.com.romenig.plataforma.banco;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.IdentidadeSupabase;
import br.com.romenig.plataforma.usuario.Perfil;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
import br.com.romenig.plataforma.usuario.VinculoDeUsuarioService;

/**
 * Criterios de aceite da HU05 - Estruturacao de Banco de Dados.
 *
 * <ol>
 *   <li>tabela de usuario (perfil da aplicacao) e tabela de papeis;</li>
 *   <li>relacionamentos e chaves estrangeiras definidos;</li>
 *   <li>senhas gerenciadas exclusivamente pelo Supabase Auth: nenhuma coluna
 *       de senha na aplicacao.</li>
 * </ol>
 *
 * <p>Roda contra o H2 em memoria, onde o Flyway executa as mesmas migrations
 * do Supabase. O RLS e o vinculo com auth.users ficam em supabase/migrations
 * e sao conferidos por supabase/verificacao/verificar_rls.sql.
 */
@SpringBootTest
@Transactional
class EstruturaDeBancoTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private VinculoDeUsuarioService vinculos;

    @Autowired
    private UsuarioRepository usuarios;

    private Usuario cadastrar(String email) {
        return vinculos.perfilDe(new IdentidadeSupabase(UUID.randomUUID(), email, "Ana Souza"));
    }

    // -----------------------------------------------------------------------
    // Criterio 1: tabelas de usuario e perfis
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("criterio 1: as tabelas usuario e perfil e a view profiles existem")
    void tabelasDeUsuarioEPerfilExistem() {
        assertThat(contarTabela("usuario")).isEqualTo(1);
        assertThat(contarTabela("perfil")).isEqualTo(1);
        assertThat(contarTabela("profiles")).isEqualTo(1);
    }

    @Test
    @DisplayName("criterio 1: o catalogo de perfis traz exatamente ADMIN e ALUNO")
    void catalogoDePerfisTemAdminEAluno() {
        List<String> nomes = jdbc.queryForList("SELECT nome FROM perfil ORDER BY nome", String.class);

        assertThat(nomes).containsExactly(Perfil.ADMIN, Perfil.ALUNO);
    }

    @Test
    @DisplayName("criterio 1: profiles expoe id do Auth, nome, avatar_url, role e datas")
    void viewProfilesExpoeOContrato() {
        Usuario usuario = cadastrar("profiles@email.com");
        usuarios.flush();

        Map<String, Object> linha = jdbc.queryForMap(
                "SELECT id, nome, avatar_url, role, created_at, updated_at FROM profiles WHERE id = ?",
                usuario.getAuthId());

        assertThat(linha.get("NOME")).isEqualTo("Ana Souza");
        assertThat(linha.get("ROLE")).isEqualTo(Perfil.ALUNO);
        assertThat(linha.get("AVATAR_URL")).isNull();
        assertThat(linha.get("CREATED_AT")).isNotNull();
        assertThat(linha.get("UPDATED_AT")).isNotNull();
    }

    // -----------------------------------------------------------------------
    // Criterio 2: relacionamento entre as tabelas
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("criterio 2: o cadastro vincula a conta ao perfil ALUNO via perfil_id")
    void cadastroVinculaPerfilAluno() {
        cadastrar("fk@email.com");
        usuarios.flush();

        String nomePerfil = jdbc.queryForObject("""
                SELECT p.nome
                  FROM usuario u
                  JOIN perfil p ON p.id = u.perfil_id
                 WHERE u.email = ?
                """, String.class, "fk@email.com");

        assertThat(nomePerfil).isEqualTo(Perfil.ALUNO);
    }

    @Test
    @DisplayName("criterio 2: o relacionamento Usuario -> Perfil e carregado pela entidade")
    void relacionamentoCarregadoPelaEntidade() {
        cadastrar("relacionamento@email.com");

        Usuario usuario = usuarios.findByEmail("relacionamento@email.com").orElseThrow();

        assertThat(usuario.getPerfilEntidade()).isNotNull();
        assertThat(usuario.getPerfilEntidade().getNome()).isEqualTo(Perfil.ALUNO);
    }

    @Test
    @DisplayName("criterio 2: a chave estrangeira recusa um perfil inexistente")
    void chaveEstrangeiraRecusaPerfilInexistente() {
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO usuario (nome, email, perfil_id)
                VALUES ('Fantasma', 'fantasma@email.com', 999999)
                """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("criterio 2: uma identidade do Supabase Auth so tem um perfil")
    void identidadeDoAuthEUnica() {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO usuario (nome, email, perfil_id, auth_id) VALUES ('A', 'a.unico@email.com', 1, ?)", id);

        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO usuario (nome, email, perfil_id, auth_id) VALUES ('B', 'b.unico@email.com', 1, ?)", id))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // -----------------------------------------------------------------------
    // Criterio 3: senhas somente no Supabase Auth
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("criterio 3: nenhuma coluna ou tabela de senha na aplicacao")
    void semArmazenamentoProprioDeSenha() {
        Integer colunasDeSenha = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.columns
                 WHERE UPPER(table_name) = 'USUARIO'
                   AND (UPPER(column_name) LIKE '%SENHA%' OR UPPER(column_name) LIKE '%PASSWORD%')
                """, Integer.class);

        assertThat(colunasDeSenha).isZero();
        assertThat(contarTabela("token_conta")).isZero();
    }

    private int contarTabela(String nome) {
        Integer total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.tables
                 WHERE UPPER(table_name) = ?
                """, Integer.class, nome.toUpperCase());
        return total == null ? 0 : total;
    }
}
