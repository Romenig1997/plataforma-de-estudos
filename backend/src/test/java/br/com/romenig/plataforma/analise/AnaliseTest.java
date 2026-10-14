package br.com.romenig.plataforma.analise;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import br.com.romenig.plataforma.usuario.CodificadorDeSenha;
import tools.jackson.databind.ObjectMapper;
@SpringBootTest @AutoConfigureMockMvc @Transactional
class AnaliseTest {
 @Autowired MockMvc http;@Autowired JdbcTemplate jdbc;@Autowired CodificadorDeSenha senhas;@Autowired ObjectMapper json;
 private String token(String email)throws Exception{
  jdbc.update("INSERT INTO usuario(nome,email,senha_hash,perfil_id) VALUES('Aluno',?,?,(SELECT id FROM perfil WHERE nome='ALUNO'))",email,senhas.codificar("senha1234"));
  return json.readTree(http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email",email,"senha","senha1234")))).andReturn().getResponse().getContentAsString()).path("token").asText();
 }
 @Test void exigeSessaoENaoAceitaResultadosDoCliente()throws Exception{http.perform(get("/api/analise")).andExpect(status().isUnauthorized());String t=token("analise.sem@email.com");http.perform(get("/api/analise").header("Authorization","Bearer "+t)).andExpect(status().isNoContent());http.perform(post("/api/analise").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isMethodNotAllowed());}
 @Test void usaSomenteEditalDaSessaoENaoTransformaConclusaoEmAcertos()throws Exception{
  String a=token("analise.a@email.com"),b=token("analise.b@email.com");
  jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES('Edital analise','Orgao',2026)");long e=jdbc.queryForObject("SELECT id FROM edital WHERE titulo='Edital analise'",Long.class);
  jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,'Portugues',2)",e);long d=jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id=?",Long.class,e);
  jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Topico',2)",d);long c=jdbc.queryForObject("SELECT id FROM conteudo WHERE disciplina_id=?",Long.class,d);
  http.perform(put("/api/planner").header("Authorization","Bearer "+a).contentType(MediaType.APPLICATION_JSON).content("{\"editalId\":"+e+",\"metaHorasSemanais\":1,\"prioridades\":[{\"disciplinaId\":"+d+",\"prioridade\":\"NORMAL\"}]}" )).andExpect(status().isOk());
  http.perform(put("/api/dashboard/registros/"+c).header("Authorization","Bearer "+a).contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":true,\"questoes\":10,\"acertos\":8}")).andExpect(status().isNoContent());
  http.perform(get("/api/analise").header("Authorization","Bearer "+a)).andExpect(status().isOk()).andExpect(jsonPath("$.editalTitulo").value("Edital analise")).andExpect(jsonPath("$.analise.desempenhoGeral").doesNotExist()).andExpect(jsonPath("$.analise.recomendacoes").isEmpty()).andExpect(jsonPath("$.analise.disciplinas[0].questoes").value(0));
  http.perform(get("/api/analise").header("Authorization","Bearer "+b)).andExpect(status().isNoContent());
 }
}
