package br.com.romenig.plataforma.conta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.ContasDeTeste;
import br.com.romenig.plataforma.planner.GerarPlanoRequest;
import br.com.romenig.plataforma.planner.Prioridade;
import br.com.romenig.plataforma.planner.cronograma.GerarCronogramaRequest;
import tools.jackson.databind.ObjectMapper;

/**
 * HU15 (o admin exclui um aluno) e HU16 (o aluno exclui a propria conta):
 * todos os dados da conta saem, o login e removido do Supabase Auth e um
 * token antigo nao recria o perfil.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ExclusaoDeContaTest {

    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired IdentidadesEmMemoria identidades;

    @Test
    void adminExcluiAlunoComTodosOsDadosEOLogin() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.exclui.aluno@email.com");
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.excluido@email.com");
        long alunoId = idDe("aluno.excluido@email.com");
        UUID authId = authIdDe("aluno.excluido@email.com");
        alunoComPlanoCronogramaEProgresso(aluno);

        http.perform(delete("/api/admin/usuarios/{id}", alunoId).header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isNoContent());

        assertThat(contar("usuario WHERE id = ?", alunoId)).isZero();
        assertThat(contar("plano_estudo WHERE usuario_id = ?", alunoId)).isZero();
        assertThat(contar("cronograma_estudo WHERE usuario_id = ?", alunoId)).isZero();
        assertThat(contar("registro_estudo WHERE usuario_id = ?", alunoId)).isZero();
        assertThat(identidades.foiRemovida(authId)).isTrue();

        // O token emitido antes da exclusao nao recria um perfil vazio.
        http.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isUnauthorized());
        assertThat(contar("usuario WHERE email = ?", "aluno.excluido@email.com")).isZero();
    }

    @Test
    void adminNaoExcluiAdministradorNemASiMesmo() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.principal@email.com");
        ContasDeTeste.admin(jdbc, "admin.outro@email.com");

        http.perform(delete("/api/admin/usuarios/{id}", idDe("admin.outro@email.com")).header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].mensagem").value(org.hamcrest.Matchers.containsString("Altere o perfil para ALUNO")));
        http.perform(delete("/api/admin/usuarios/{id}", idDe("admin.principal@email.com")).header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isBadRequest());

        assertThat(contar("usuario WHERE email IN ('admin.principal@email.com', 'admin.outro@email.com')")).isEqualTo(2);
    }

    @Test
    void alunoNaoExcluiOutrasContas() throws Exception {
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.curioso@email.com");
        ContasDeTeste.aluno(jdbc, "aluno.alvo@email.com");

        http.perform(delete("/api/admin/usuarios/{id}", idDe("aluno.alvo@email.com")).header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isForbidden());
        assertThat(contar("usuario WHERE email = ?", "aluno.alvo@email.com")).isEqualTo(1);
    }

    @Test
    void alunoExcluiAPropriaContaEPodeSeCadastrarDeNovo() throws Exception {
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.sai@email.com");
        long alunoId = idDe("aluno.sai@email.com");
        UUID authId = authIdDe("aluno.sai@email.com");
        alunoComPlanoCronogramaEProgresso(aluno);

        http.perform(delete("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isNoContent());

        assertThat(contar("usuario WHERE id = ?", alunoId)).isZero();
        assertThat(contar("registro_estudo WHERE usuario_id = ?", alunoId)).isZero();
        assertThat(identidades.foiRemovida(authId)).isTrue();
        http.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isUnauthorized());

        // Novo cadastro no Supabase com o mesmo e-mail gera outra identidade.
        String novo = ContasDeTeste.token(UUID.randomUUID(), "aluno.sai@email.com", "Aluno de volta");
        http.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + novo))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("aluno.sai@email.com"));
    }

    @Test
    void administradorNaoExcluiAPropriaConta() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.fica@email.com");

        http.perform(delete("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isBadRequest());
        assertThat(contar("usuario WHERE email = ?", "admin.fica@email.com")).isEqualTo(1);
    }

    @Test
    void exclusaoExigeLogin() throws Exception {
        http.perform(delete("/api/perfil")).andExpect(status().isUnauthorized());
    }

    // -----------------------------------------------------------------------

    private void alunoComPlanoCronogramaEProgresso(String token) throws Exception {
        String titulo = "Edital exclusao " + UUID.randomUUID();
        jdbc.update("INSERT INTO edital(titulo, orgao, ano) VALUES(?, 'Orgao', 2026)", titulo);
        long edital = jdbc.queryForObject("SELECT id FROM edital WHERE titulo = ?", Long.class, titulo);
        jdbc.update("INSERT INTO disciplina(edital_id, nome, pagina) VALUES(?, 'Portugues', 2)", edital);
        long disciplina = jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id = ?", Long.class, edital);
        jdbc.update("INSERT INTO conteudo(disciplina_id, nome, pagina) VALUES(?, 'Interpretacao', 2)", disciplina);
        long conteudo = jdbc.queryForObject("SELECT id FROM conteudo WHERE disciplina_id = ?", Long.class, disciplina);

        http.perform(put("/api/planner").header(HttpHeaders.AUTHORIZATION, "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new GerarPlanoRequest(edital, 2,
                                List.of(new GerarPlanoRequest.PrioridadeDisciplina(disciplina, Prioridade.NORMAL))))))
                .andExpect(status().isOk());
        http.perform(put("/api/cronograma").header(HttpHeaders.AUTHORIZATION, "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new GerarCronogramaRequest(LocalDate.of(2026, 10, 19),
                                List.of(new GerarCronogramaRequest.PeriodoDisponivel(1, LocalTime.of(19, 0), LocalTime.of(21, 0)))))))
                .andExpect(status().isOk());
        http.perform(put("/api/dashboard/registros/" + conteudo).header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":true}"))
                .andExpect(status().is2xxSuccessful());
    }

    private long idDe(String email) {
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private UUID authIdDe(String email) {
        return jdbc.queryForObject("SELECT auth_id FROM usuario WHERE email = ?", UUID.class, email);
    }

    private int contar(String deOnde, Object... parametros) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM " + deOnde, Integer.class, parametros);
    }
}
