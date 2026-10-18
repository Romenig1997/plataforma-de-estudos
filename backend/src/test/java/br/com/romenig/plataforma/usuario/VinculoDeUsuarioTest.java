package br.com.romenig.plataforma.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.ContasDeTeste;

/**
 * Cadastro (HU01) com o Supabase Auth: o perfil da aplicacao nasce com o
 * papel ALUNO para cada identidade nova, e contas antigas sao vinculadas pelo
 * e-mail sem perder o progresso.
 *
 * <p>No Supabase o gatilho {@code sincronizar_perfil_do_auth} faz o mesmo no
 * momento do cadastro; aqui (H2) o backend cobre o caso no primeiro acesso.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VinculoDeUsuarioTest {

    @Autowired
    private MockMvc http;

    @Autowired
    private JdbcTemplate jdbc;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entidades;

    private org.springframework.test.web.servlet.ResultActions me(String token) throws Exception {
        return http.perform(get("/api/auth/me").header("Authorization", "Bearer " + token));
    }

    @Test
    @DisplayName("identidade nova vira perfil ALUNO com o nome informado no cadastro")
    void criaPerfilAluno() throws Exception {
        UUID id = UUID.randomUUID();

        me(ContasDeTeste.token(id, "Nova.Conta@Email.com", "  Maria Lima  "))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Maria Lima"))
                .andExpect(jsonPath("$.email").value("nova.conta@email.com"))
                .andExpect(jsonPath("$.perfil").value("ALUNO"));

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM usuario WHERE auth_id = ?", Integer.class, id)).isOne();
    }

    @Test
    @DisplayName("sem nome no cadastro, usa o inicio do e-mail")
    void nomePadraoVemDoEmail() throws Exception {
        me(ContasDeTeste.token(UUID.randomUUID(), "joana@email.com", null))
                .andExpect(jsonPath("$.nome").value("joana"));
    }

    @Test
    @DisplayName("acessos seguidos nao duplicam o perfil")
    void naoDuplicaPerfil() throws Exception {
        String token = ContasDeTeste.token(UUID.randomUUID(), "repetido@email.com", "Ana");
        me(token).andExpect(status().isOk());
        me(token).andExpect(status().isOk());

        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM usuario WHERE email = 'repetido@email.com'", Integer.class)).isOne();
    }

    @Test
    @DisplayName("conta antiga com o mesmo e-mail e vinculada e preserva papel e progresso")
    void vinculaContaAntiga() throws Exception {
        jdbc.update("""
                INSERT INTO usuario (nome, email, perfil_id, meta_estudo_semanal, email_verificado)
                VALUES ('Conta antiga', 'antiga@email.com', (SELECT id FROM perfil WHERE nome = 'ADMIN'), 12, TRUE)
                """);
        long idAntigo = jdbc.queryForObject("SELECT id FROM usuario WHERE email = 'antiga@email.com'", Long.class);
        UUID authId = UUID.randomUUID();

        me(ContasDeTeste.token(authId, "antiga@email.com", "Outro nome"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(idAntigo))
                .andExpect(jsonPath("$.nome").value("Conta antiga"))
                .andExpect(jsonPath("$.perfil").value("ADMIN"));

        entidades.flush();
        assertThat(jdbc.queryForObject("SELECT auth_id FROM usuario WHERE id = ?", UUID.class, idAntigo)).isEqualTo(authId);
    }

    @Test
    @DisplayName("e-mail ja ligado a outra identidade nao e assumido")
    void naoAssumeContaDeOutraIdentidade() throws Exception {
        ContasDeTeste.criar(jdbc, "Dona", "dona@email.com", "ALUNO");

        me(ContasDeTeste.token(UUID.randomUUID(), "dona@email.com", "Intrusa"))
                .andExpect(status().isUnauthorized());
    }
}
