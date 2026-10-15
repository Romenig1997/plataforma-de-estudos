package br.com.romenig.plataforma.planner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import br.com.romenig.plataforma.usuario.CodificadorDeSenha;
import tools.jackson.databind.ObjectMapper;

/** Varios cursos por aluno: inscricao, foco, cancelamento e cronograma combinado. */
@SpringBootTest @AutoConfigureMockMvc @Transactional
class InscricaoTest {
    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired CodificadorDeSenha senhas;
    @Autowired ObjectMapper json;

    /** Edital com uma disciplina e dois topicos finais: {edital, disciplina, topico1, topico2}. */
    record Curso(long edital, long disciplina, long topico1, long topico2) { }

    private String token(String email, String perfil) throws Exception {
        jdbc.update("INSERT INTO usuario(nome,email,senha_hash,perfil_id,meta_estudo_semanal) VALUES('Aluno',?,?,(SELECT id FROM perfil WHERE nome=?),NULL)",
                email, senhas.codificar("senha1234"), perfil);
        String corpo = http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "senha", "senha1234"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(corpo).path("token").asText();
    }

    private Curso curso(String titulo) {
        jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES(?,'Orgao',2026)", titulo);
        long edital = jdbc.queryForObject("SELECT id FROM edital WHERE titulo=?", Long.class, titulo);
        jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,?,1)", edital, "Disciplina " + titulo);
        long disciplina = jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id=?", Long.class, edital);
        jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Topico A',1),(?,'Topico B',2)", disciplina, disciplina);
        var topicos = jdbc.queryForList("SELECT id FROM conteudo WHERE disciplina_id=? ORDER BY id", Long.class, disciplina);
        return new Curso(edital, disciplina, topicos.get(0), topicos.get(1));
    }

    private ResultActions inscrever(String token, Curso curso) throws Exception {
        return http.perform(post("/api/cursos/" + curso.edital() + "/inscricao").header("Authorization", "Bearer " + token));
    }

    private ResultActions inscricoes(String token) throws Exception {
        return http.perform(get("/api/cursos/inscricoes").header("Authorization", "Bearer " + token));
    }

    private void cronograma(String token) throws Exception {
        http.perform(put("/api/cronograma").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"semanaInicio\":\"2026-10-19\",\"disponibilidades\":[{\"diaSemana\":1,\"inicio\":\"06:00\",\"fim\":\"23:00\"},{\"diaSemana\":2,\"inicio\":\"06:00\",\"fim\":\"23:00\"}]}"))
                .andExpect(status().isOk());
    }

    @Test void inscricaoUsaMetaPadraoPrioridadesNormaisEEIdempotente() throws Exception {
        String t = token("inscricao.a@email.com", "ALUNO"); var curso = curso("Curso inscricao");
        inscrever(t, curso).andExpect(status().isOk())
                .andExpect(jsonPath("$.metaHorasSemanais").value(PlannerService.META_PADRAO))
                .andExpect(jsonPath("$.disciplinas[0].prioridade").value("NORMAL"))
                .andExpect(jsonPath("$.emFoco").value(true));
        inscrever(t, curso).andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM plano_estudo", Integer.class)).isEqualTo(1);
    }

    @Test void listaCursosComProgressoEFocoUnico() throws Exception {
        String t = token("inscricao.b@email.com", "ALUNO"); var a = curso("Curso A"); var b = curso("Curso B");
        inscrever(t, a); inscrever(t, b);
        http.perform(put("/api/dashboard/registros/" + b.topico1()).header("Authorization", "Bearer " + t)
                .contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":true}")).andExpect(status().isNoContent());
        inscricoes(t).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].editalId").value(a.edital())).andExpect(jsonPath("$[0].emFoco").value(true))
                .andExpect(jsonPath("$[1].emFoco").value(false)).andExpect(jsonPath("$[1].progresso").value(50))
                .andExpect(jsonPath("$[1].topicosConcluidos").value(1));

        http.perform(put("/api/cursos/foco").header("Authorization", "Bearer " + t).contentType(MediaType.APPLICATION_JSON)
                .content("{\"editalId\":" + b.edital() + "}")).andExpect(status().isOk()).andExpect(jsonPath("$.emFoco").value(true));
        inscricoes(t).andExpect(jsonPath("$[0].emFoco").value(false)).andExpect(jsonPath("$[1].emFoco").value(true));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM plano_estudo WHERE em_foco = TRUE", Integer.class)).isEqualTo(1);
        http.perform(get("/api/dashboard").header("Authorization", "Bearer " + t)).andExpect(jsonPath("$.editalId").value(b.edital()));
    }

    @Test void cancelarPassaOFocoEPreservaRegistros() throws Exception {
        String t = token("inscricao.c@email.com", "ALUNO"); var a = curso("Curso C1"); var b = curso("Curso C2");
        inscrever(t, a); inscrever(t, b);
        http.perform(put("/api/dashboard/registros/" + a.topico1()).header("Authorization", "Bearer " + t)
                .contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":true}")).andExpect(status().isNoContent());

        http.perform(delete("/api/cursos/" + a.edital() + "/inscricao").header("Authorization", "Bearer " + t)).andExpect(status().isNoContent());
        inscricoes(t).andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].editalId").value(b.edital())).andExpect(jsonPath("$[0].emFoco").value(true));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM registro_estudo", Integer.class)).isEqualTo(1);

        // Voltar ao curso recupera o progresso guardado.
        inscrever(t, a);
        inscricoes(t).andExpect(jsonPath("$[1].editalId").value(a.edital())).andExpect(jsonPath("$[1].topicosConcluidos").value(1));
        http.perform(delete("/api/cursos/999999/inscricao").header("Authorization", "Bearer " + t)).andExpect(status().isBadRequest());
    }

    @Test void cronogramaCombinaCursosEPerdeSoOCursoCancelado() throws Exception {
        String t = token("inscricao.d@email.com", "ALUNO"); var a = curso("Curso D1"); var b = curso("Curso D2");
        inscrever(t, a); inscrever(t, b); cronograma(t);
        var agenda = json.readTree(http.perform(get("/api/cronograma").header("Authorization", "Bearer " + t)).andReturn().getResponse().getContentAsString());
        assertThat(agenda.path("cursos").size()).isEqualTo(2);
        assertThat(agenda.path("metaHorasSemanais").asInt()).isEqualTo(2 * PlannerService.META_PADRAO);
        Set<Long> editais = new HashSet<>();
        agenda.path("atividades").forEach(atividade -> editais.add(atividade.path("editalId").asLong()));
        assertThat(editais).containsExactlyInAnyOrder(a.edital(), b.edital());
        assertThat(agenda.path("desatualizado").asBoolean()).isFalse();

        // Novo curso fora da agenda deixa o cronograma desatualizado.
        var c = curso("Curso D3"); inscrever(t, c);
        http.perform(get("/api/cronograma").header("Authorization", "Bearer " + t)).andExpect(jsonPath("$.desatualizado").value(true));
        http.perform(delete("/api/cursos/" + c.edital() + "/inscricao").header("Authorization", "Bearer " + t)).andExpect(status().isNoContent());

        http.perform(delete("/api/cursos/" + a.edital() + "/inscricao").header("Authorization", "Bearer " + t)).andExpect(status().isNoContent());
        agenda = json.readTree(http.perform(get("/api/cronograma").header("Authorization", "Bearer " + t)).andReturn().getResponse().getContentAsString());
        assertThat(agenda.path("cursos").size()).isEqualTo(1);
        assertThat(agenda.path("desatualizado").asBoolean()).isFalse();
        agenda.path("atividades").forEach(atividade -> assertThat(atividade.path("editalId").asLong()).isEqualTo(b.edital()));

        // Painel de cada curso mostra so as proprias atividades.
        http.perform(get("/api/dashboard").param("agora", "2026-10-19T00:00:00").header("Authorization", "Bearer " + t))
                .andExpect(jsonPath("$.editalId").value(b.edital()))
                .andExpect(jsonPath("$.proximasAtividades[0].editalId").value(b.edital()));
    }

    @Test void questoesDeQualquerCursoInscrito() throws Exception {
        String admin = token("inscricao.admin@email.com", "ADMIN"), t = token("inscricao.e@email.com", "ALUNO");
        var a = curso("Curso E1"); var b = curso("Curso E2");
        inscrever(t, a); inscrever(t, b);
        String questao = "{\"editalId\":" + b.edital() + ",\"conteudoId\":" + b.topico1()
                + ",\"enunciado\":\"Q?\",\"alternativas\":[\"A\",\"B\",\"C\",\"D\"],\"gabarito\":0,\"explicacao\":\"E\"}";
        long id = json.readTree(http.perform(post("/api/admin/questoes").header("Authorization", "Bearer " + admin)
                .contentType(MediaType.APPLICATION_JSON).content(questao)).andReturn().getResponse().getContentAsString()).path("id").asLong();
        http.perform(post("/api/admin/questoes/" + id + "/publicar").header("Authorization", "Bearer " + admin)).andExpect(status().isOk());

        http.perform(get("/api/questoes").header("Authorization", "Bearer " + t)).andExpect(jsonPath("$.length()").value(0));
        http.perform(get("/api/questoes").param("editalId", String.valueOf(b.edital())).header("Authorization", "Bearer " + t))
                .andExpect(jsonPath("$.length()").value(1));
        http.perform(post("/api/questoes/" + id + "/resposta").header("Authorization", "Bearer " + t)
                .contentType(MediaType.APPLICATION_JSON).content("{\"alternativa\":0}")).andExpect(status().isOk());
    }

    @Test void rotasDeCursoExigemSessao() throws Exception {
        http.perform(get("/api/cursos/inscricoes")).andExpect(status().isUnauthorized());
        http.perform(post("/api/cursos/1/inscricao")).andExpect(status().isUnauthorized());
        http.perform(put("/api/cursos/foco").contentType(MediaType.APPLICATION_JSON).content("{\"editalId\":1}")).andExpect(status().isUnauthorized());
    }
}
