package br.com.romenig.plataforma.planner.cronograma;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.*;
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
import br.com.romenig.plataforma.planner.*;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest @AutoConfigureMockMvc @Transactional
class CronogramaTest {
    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired CodificadorDeSenha senhas;
    @Autowired ObjectMapper json;
    private String token(String email) throws Exception {
        jdbc.update("INSERT INTO usuario(nome,email,senha_hash,perfil_id) VALUES('Aluno',?,?,(SELECT id FROM perfil WHERE nome='ALUNO'))",email,senhas.codificar("senha1234"));
        var resposta=http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email,"senha","senha1234"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).path("token").asText();
    }
    private long[] edital() {
        jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES('Edital cronograma','Orgao',2026)");
        long edital=jdbc.queryForObject("SELECT id FROM edital WHERE titulo='Edital cronograma'",Long.class);
        jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,'Portugues',2)",edital);
        long disciplina=jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id=?",Long.class,edital);
        jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Interpretacao',2)",disciplina);
        return new long[]{edital,disciplina};
    }
    private void plano(String token,long[] ids,int horas) throws Exception {
        http.perform(put("/api/planner").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new GerarPlanoRequest(ids[0],horas,List.of(new GerarPlanoRequest.PrioridadeDisciplina(ids[1],Prioridade.NORMAL))))))
                .andExpect(status().isOk());
    }
    private String request(String fim) throws Exception {
        return json.writeValueAsString(new GerarCronogramaRequest(LocalDate.of(2026,10,19),List.of(new GerarCronogramaRequest.PeriodoDisponivel(1,LocalTime.of(19,0),LocalTime.parse(fim)))));
    }
    private void gerar(String token,String corpo) throws Exception {
        http.perform(put("/api/cronograma").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(corpo)).andExpect(status().isOk());
    }
    @Test void geraPersisteLeAtualizaENaoDuplicaAtividades() throws Exception {
        String token=token("cronograma.salvar@email.com"); var ids=edital(); plano(token,ids,2);
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+token)).andExpect(status().isNoContent());
        gerar(token,request("21:00"));
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.atividades.length()").value(2)).andExpect(jsonPath("$.atividades[0].disciplina").value("Portugues"))
                .andExpect(jsonPath("$.atividades[0].conteudo").value("Interpretacao")).andExpect(jsonPath("$.atividades[0].pagina").value(2))
                .andExpect(jsonPath("$.desatualizado").value(false));
        gerar(token,request("22:00"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM cronograma_estudo",Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM atividade_estudo",Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM disponibilidade_estudo",Integer.class)).isEqualTo(1);
    }
    @Test void sessaoDeTopicoConcluidoVemMarcadaComoFeita() throws Exception {
        String token=token("cronograma.feita@email.com"); var ids=edital(); plano(token,ids,2); gerar(token,request("21:00"));
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.atividades[0].concluido").value(false));
        long conteudo=jdbc.queryForObject("SELECT id FROM conteudo WHERE disciplina_id=?",Long.class,ids[1]);
        http.perform(put("/api/dashboard/registros/"+conteudo).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"concluido\":true}")).andExpect(status().is2xxSuccessful());
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+token))
                .andExpect(jsonPath("$.atividades[0].concluido").value(true)).andExpect(jsonPath("$.atividades[1].concluido").value(true));
    }
    @Test void semanaPassadaVaiParaASemanaAtualComTopicosPendentesPrimeiro() throws Exception {
        String token=token("cronograma.virada@email.com"); var ids=edital();
        jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Crase',3)",ids[1]);
        plano(token,ids,2);
        // Relogio dos testes: sexta 16/10/2026, semana atual de 12/10. A agenda e da semana de 05/10.
        gerar(token,json.writeValueAsString(new GerarCronogramaRequest(LocalDate.of(2026,10,5),List.of(new GerarCronogramaRequest.PeriodoDisponivel(1,LocalTime.of(19,0),LocalTime.of(21,0))))));
        long interpretacao=jdbc.queryForObject("SELECT id FROM conteudo WHERE nome='Interpretacao' AND disciplina_id=?",Long.class,ids[1]);
        http.perform(put("/api/dashboard/registros/"+interpretacao).header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON)
                .content("{\"concluido\":true}")).andExpect(status().is2xxSuccessful());
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.semanaInicio").value("2026-10-12")).andExpect(jsonPath("$.atividades[0].data").value("2026-10-12"))
                .andExpect(jsonPath("$.atividades[0].conteudo").value("Crase")).andExpect(jsonPath("$.atividades[0].concluido").value(false))
                .andExpect(jsonPath("$.atividades[1].conteudo").value("Interpretacao")).andExpect(jsonPath("$.disponibilidades.length()").value(1));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM atividade_estudo",Integer.class)).isEqualTo(2);
    }
    @Test void cronogramaDeOutroUsuarioNaoPodeSerLidoOuSobrescrito() throws Exception {
        var ids=edital(); String ana=token("cronograma.ana@email.com"),bia=token("cronograma.bia@email.com");
        plano(ana,ids,2); plano(bia,ids,1); gerar(ana,request("21:00"));
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+bia)).andExpect(status().isNoContent());
        gerar(bia,request("20:00"));
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+ana)).andExpect(jsonPath("$.metaHorasSemanais").value(2));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM cronograma_estudo",Integer.class)).isEqualTo(2);
    }
    @Test void rejeitaDisponibilidadeInsuficienteEPreservaCronogramaAnterior() throws Exception {
        String token=token("cronograma.insuficiente@email.com"); plano(token,edital(),2); gerar(token,request("21:00"));
        http.perform(put("/api/cronograma").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(request("20:00")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.erros[0].campo").value("disponibilidades"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM atividade_estudo",Integer.class)).isEqualTo(2);
    }
    @Test void mudancaDoPlanoSinalizaAgendaDesatualizadaSemAlterarAtividadesSalvas() throws Exception {
        String token=token("cronograma.atualizar@email.com"); var ids=edital(); plano(token,ids,2); gerar(token,request("21:00"));
        plano(token,ids,1);
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.desatualizado").value(true))
                .andExpect(jsonPath("$.metaHorasSemanais").value(2));
        gerar(token,request("21:00"));
        http.perform(get("/api/cronograma").header("Authorization","Bearer "+token)).andExpect(jsonPath("$.desatualizado").value(false))
                .andExpect(jsonPath("$.atividades.length()").value(1));
    }
    @Test void exigePlanoAutenticacaoEDadosValidos() throws Exception {
        http.perform(get("/api/cronograma")).andExpect(status().isUnauthorized());
        http.perform(put("/api/cronograma").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());
        String token=token("cronograma.sem.plano@email.com");
        http.perform(put("/api/cronograma").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(request("21:00")))
                .andExpect(status().isBadRequest());
        http.perform(put("/api/cronograma").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content("{\"semanaInicio\":\"2026-10-19\",\"disponibilidades\":[null]}"))
                .andExpect(status().isBadRequest());
    }
}
