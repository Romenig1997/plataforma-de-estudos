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
import org.springframework.transaction.annotation.Transactional;
import br.com.romenig.plataforma.usuario.CodificadorDeSenha;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest @AutoConfigureMockMvc @Transactional
class PlannerTest {
    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired CodificadorDeSenha senhas;
    @Autowired ObjectMapper json;

    private String token(String email) throws Exception {
        jdbc.update("INSERT INTO usuario(nome,email,senha_hash,perfil_id) VALUES('Aluno',?,?,(SELECT id FROM perfil WHERE nome='ALUNO'))", email, senhas.codificar("senha1234"));
        String corpo = http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email",email,"senha","senha1234"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(corpo).path("token").asText();
    }
    private long edital(String titulo) {
        jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES(?, 'Orgao', 2026)", titulo);
        long id = jdbc.queryForObject("SELECT id FROM edital WHERE titulo=?",Long.class,titulo);
        jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?, 'Portugues',1),(?, 'Matematica',2)",id,id);
        return id;
    }
    private List<Long> disciplinas(long edital) { return jdbc.queryForList("SELECT id FROM disciplina WHERE edital_id=? ORDER BY id",Long.class,edital); }
    private String request(long edital, int horas) throws Exception {
        var ids = disciplinas(edital);
        return json.writeValueAsString(new GerarPlanoRequest(edital,horas,List.of(
                new GerarPlanoRequest.PrioridadeDisciplina(ids.get(0),Prioridade.ALTA),
                new GerarPlanoRequest.PrioridadeDisciplina(ids.get(1),Prioridade.BAIXA))));
    }
    private void gerar(String token, String corpo) throws Exception {
        http.perform(put("/api/planner").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(corpo)).andExpect(status().isOk());
    }

    @Test void geraPersisteEAtualizaPlanoDoAluno() throws Exception {
        String token=token("planner.aluno@email.com"); long edital=edital("Edital planner");
        http.perform(get("/api/planner").header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        gerar(token,request(edital,4));
        http.perform(get("/api/planner").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.metaHorasSemanais").value(4)).andExpect(jsonPath("$.disciplinas[0].minutosSemanais").value(180))
                .andExpect(jsonPath("$.disciplinas[1].minutosSemanais").value(60));
        gerar(token,request(edital,8));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM plano_estudo",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT sum(minutos_semanais) FROM plano_disciplina",Integer.class)).isEqualTo(480);
        // Outro edital vira uma segunda inscricao; o primeiro curso continua em foco.
        long outro=edital("Outro edital planner"); gerar(token,request(outro,6));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM plano_estudo",Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM plano_disciplina",Integer.class)).isEqualTo(4);
        http.perform(get("/api/planner").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.edital.id").value(edital)).andExpect(jsonPath("$.emFoco").value(true));
        http.perform(get("/api/planner").param("editalId",String.valueOf(outro)).header("Authorization","Bearer "+token))
                .andExpect(jsonPath("$.edital.id").value(outro)).andExpect(jsonPath("$.emFoco").value(false)).andExpect(jsonPath("$.metaHorasSemanais").value(6));
    }
    @Test void usuariosNaoLeemNemSobrescrevemPlanosAlheios() throws Exception {
        long edital=edital("Edital isolado"); String ana=token("planner.ana@email.com"),bia=token("planner.bia@email.com");
        gerar(ana,request(edital,4));
        http.perform(get("/api/planner").header("Authorization","Bearer "+bia)).andExpect(status().isNoContent());
        gerar(bia,request(edital,2));
        http.perform(get("/api/planner").header("Authorization","Bearer "+ana)).andExpect(jsonPath("$.metaHorasSemanais").value(4));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM plano_estudo",Integer.class)).isEqualTo(2);
    }
    @Test void exigeAutenticacaoParaLerEGerar() throws Exception {
        http.perform(get("/api/planner")).andExpect(status().isUnauthorized());
        http.perform(put("/api/planner").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
    }
    @Test void rejeitaMetaInvalidaENaoCriaPlano() throws Exception {
        String token=token("planner.meta@email.com"); long edital=edital("Edital meta");
        for (int horas : List.of(0,169)) http.perform(put("/api/planner").header("Authorization","Bearer "+token)
                .contentType(MediaType.APPLICATION_JSON).content(request(edital,horas))).andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM plano_estudo",Integer.class)).isZero();
    }
    @Test void rejeitaDisciplinasAusentesDuplicadasOuDeOutroEdital() throws Exception {
        String token=token("planner.prioridades@email.com"); long edital=edital("Edital certo"), outro=edital("Edital errado");
        long id=disciplinas(edital).get(0), alheia=disciplinas(outro).get(0);
        for (var ids : List.of(List.of(id),List.of(id,id),List.of(id,alheia))) {
            var prioridades=ids.stream().map(d->new GerarPlanoRequest.PrioridadeDisciplina(d,Prioridade.NORMAL)).toList();
            http.perform(put("/api/planner").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                    .content(json.writeValueAsString(new GerarPlanoRequest(edital,4,prioridades)))).andExpect(status().isBadRequest());
        }
    }
    @Test void rejeitaEditalInexistenteEPrioridadeInvalida() throws Exception {
        String token=token("planner.edital@email.com"); long edital=edital("Edital enum");
        http.perform(put("/api/planner").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(request(edital,4).replace("ALTA","URGENTE"))).andExpect(status().isBadRequest());
        http.perform(put("/api/planner").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"editalId\":999999,\"metaHorasSemanais\":4,\"prioridades\":[{\"disciplinaId\":1,\"prioridade\":\"NORMAL\"}]}"))
                .andExpect(status().isBadRequest());
    }
}
