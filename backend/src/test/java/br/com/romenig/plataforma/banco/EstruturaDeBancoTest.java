package br.com.romenig.plataforma.banco;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.usuario.CadastroUsuarioService;
import br.com.romenig.plataforma.usuario.Perfil;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
import br.com.romenig.plataforma.usuario.dto.CadastroUsuarioRequest;

/**
 * Criterios de aceite da HU05 - Estruturacao de Banco de Dados.
 *
 * <p>Os tres criterios do documento:
 * <ol>
 *   <li>tabela de usuario e tabela de perfis criada;</li>
 *   <li>relacionamento entre as tabelas definido;</li>
 *   <li>senhas armazenadas com criptografia (hash PBKDF2, nao reversivel).</li>
 * </ol>
 *
 * <p>Roda contra o H2 em memoria, onde o Flyway executa as migrations V1 e V2
 * do zero - as mesmas que criam a estrutura no Supabase. Cada teste roda em
 * transacao com rollback.
 */
@SpringBootTest
@Transactional
class EstruturaDeBancoTest {

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CadastroUsuarioService cadastro;

    @Autowired
    private UsuarioRepository usuarios;

    private void cadastrar(String email) {
        cadastro.cadastrar(new CadastroUsuarioRequest("Ana Souza", email, "senha1234"));
    }

    // -----------------------------------------------------------------------
    // Criterio 1: tabelas de usuario e perfis
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("criterio 1: as tabelas usuario e perfil existem")
    void tabelasDeUsuarioEPerfilExistem() {
        assertThat(contarTabela("usuario")).isEqualTo(1);
        assertThat(contarTabela("perfil")).isEqualTo(1);
    }

    @Test
    @DisplayName("criterio 1: o catalogo de perfis traz exatamente ADMIN e ALUNO")
    void catalogoDePerfisTemAdminEAluno() {
        List<String> nomes = jdbc.queryForList("SELECT nome FROM perfil ORDER BY nome", String.class);

        assertThat(nomes).containsExactly(Perfil.ADMIN, Perfil.ALUNO);
    }

    // -----------------------------------------------------------------------
    // Criterio 2: relacionamento entre as tabelas
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("criterio 2: o cadastro vincula a conta ao perfil ALUNO via perfil_id")
    void cadastroVinculaPerfilAluno() {
        cadastrar("fk@email.com");

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
                INSERT INTO usuario (nome, email, senha_hash, perfil_id)
                VALUES ('Fantasma', 'fantasma@email.com', 'x', 999999)
                """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // -----------------------------------------------------------------------
    // Criterio 3: senhas nao reversiveis
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("criterio 3: a senha e gravada como hash PBKDF2, nunca em claro")
    void senhaGravadaComHash() {
        cadastrar("hash@email.com");

        String hash = jdbc.queryForObject(
                "SELECT senha_hash FROM usuario WHERE email = ?", String.class, "hash@email.com");

        assertThat(hash)
                .isNotEqualTo("senha1234")
                .startsWith("pbkdf2-sha256$");
    }

    private int contarTabela(String nome) {
        Integer total = jdbc.queryForObject("""
                SELECT COUNT(*) FROM information_schema.tables
                 WHERE UPPER(table_name) = ?
                """, Integer.class, nome.toUpperCase());
        return total == null ? 0 : total;
    }
}
