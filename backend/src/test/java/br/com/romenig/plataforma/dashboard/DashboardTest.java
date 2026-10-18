package br.com.romenig.plataforma.dashboard;
import static org.assertj.core.api.Assertions.*;
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
import br.com.romenig.plataforma.ContasDeTeste;
import tools.jackson.databind.ObjectMapper;
@SpringBootTest @AutoConfigureMockMvc @Transactional
class DashboardTest {
 @Autowired MockMvc http; @Autowired JdbcTemplate jdbc;  @Autowired ObjectMapper json;
 String token(String email)throws Exception{
  return ContasDeTeste.criar(jdbc, "Aluno", email, "ALUNO");
 }
 long[] edital(){
  jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES('Edital dashboard','Orgao',2026)");long e=jdbc.queryForObject("SELECT id FROM edital WHERE titulo='Edital dashboard'",Long.class);
  jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,'Portugues',2)",e);long d=jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id=?",Long.class,e);
  jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Grupo',2)",d);long pai=jdbc.queryForObject("SELECT id FROM conteudo WHERE disciplina_id=?",Long.class,d);
  jdbc.update("INSERT INTO conteudo(disciplina_id,pai_id,nome,pagina) VALUES(?,?,'Topico A',2),(?,?,'Topico B',2)",d,pai,d,pai);
  var ids=jdbc.queryForList("SELECT id FROM conteudo WHERE pai_id=? ORDER BY id",Long.class,pai);return new long[]{e,d,ids.get(0),ids.get(1),pai};
 }
 void plano(String t,long[] ids)throws Exception{http.perform(put("/api/planner").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"editalId\":"+ids[0]+",\"metaHorasSemanais\":2,\"prioridades\":[{\"disciplinaId\":"+ids[1]+",\"prioridade\":\"NORMAL\"}]}" )).andExpect(status().isOk());}
 void salvar(String t,long id,boolean c,int q,int a)throws Exception{http.perform(put("/api/dashboard/registros/"+id).header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(new RegistroRequest(c)))).andExpect(status().isNoContent());}
 org.springframework.test.web.servlet.ResultActions painel(String t)throws Exception{return http.perform(get("/api/dashboard").param("agora","2026-10-19T19:00:00").header("Authorization","Bearer "+t));}
 @Test void contaApenasTopicosFinaisSemInventarDesempenho()throws Exception{
  String t=token("dashboard.a@email.com");var ids=edital();plano(t,ids);
  painel(t).andExpect(jsonPath("$.totalTopicos").value(2)).andExpect(jsonPath("$.progresso").value(0)).andExpect(jsonPath("$.disciplinas[0].desempenho").doesNotExist());
  salvar(t,ids[2],true,10,8);salvar(t,ids[3],false,30,12);
  painel(t).andExpect(jsonPath("$.progresso").value(50)).andExpect(jsonPath("$.topicosConcluidos").value(1)).andExpect(jsonPath("$.disciplinas[0].desempenho").doesNotExist()).andExpect(jsonPath("$.disciplinas[0].questoes").value(0));
 }
 @Test void atualizarEDesmarcarNaoDuplicaRegistros()throws Exception{
  String t=token("dashboard.b@email.com");var ids=edital();plano(t,ids);salvar(t,ids[2],true,10,8);salvar(t,ids[2],false,5,1);
  painel(t).andExpect(jsonPath("$.progresso").value(0)).andExpect(jsonPath("$.disciplinas[0].questoes").value(0)).andExpect(jsonPath("$.disciplinas[0].desempenho").doesNotExist());
  assertThat(jdbc.queryForObject("SELECT count(*) FROM registro_estudo",Integer.class)).isEqualTo(1);
 }
 @Test void usuariosNaoCompartilhamRegistros()throws Exception{
  String a=token("dashboard.c@email.com"),b=token("dashboard.d@email.com");var ids=edital();plano(a,ids);plano(b,ids);salvar(a,ids[2],true,10,8);
  painel(b).andExpect(jsonPath("$.progresso").value(0));salvar(b,ids[2],false,1,0);painel(a).andExpect(jsonPath("$.progresso").value(50));
 }
 @Test void validaTotaisConteudoEAutenticacaoEPreservaValores()throws Exception{
  http.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());String t=token("dashboard.e@email.com");painel(t).andExpect(status().isNoContent());var ids=edital();plano(t,ids);salvar(t,ids[2],true,10,8);
  http.perform(put("/api/dashboard/registros/"+ids[2]).header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":true,\"questoes\":10,\"acertos\":10}")).andExpect(status().isNoContent());
  painel(t).andExpect(jsonPath("$.disciplinas[0].questoes").value(0)).andExpect(jsonPath("$.disciplinas[0].desempenho").doesNotExist());
  for(long id:new long[]{ids[4],999999}) http.perform(put("/api/dashboard/registros/"+id).header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":true,\"questoes\":0,\"acertos\":0}")).andExpect(status().isBadRequest());
  http.perform(put("/api/dashboard/registros/"+ids[2]).header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":null,\"questoes\":-1,\"acertos\":0}")).andExpect(status().isBadRequest());
  painel(t).andExpect(jsonPath("$.disciplinas[0].acertos").value(0));
 }
 @Test void proximasOrdenadasExcluemPassadasETopicosConcluidos()throws Exception{
  String t=token("dashboard.f@email.com");var ids=edital();plano(t,ids);
  http.perform(put("/api/cronograma").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"semanaInicio\":\"2026-10-19\",\"disponibilidades\":[{\"diaSemana\":1,\"inicio\":\"19:00\",\"fim\":\"21:00\"}]}")).andExpect(status().isOk());
  painel(t).andExpect(jsonPath("$.proximasAtividades.length()").value(2)).andExpect(jsonPath("$.proximasAtividades[0].inicio").value("19:00:00"));
  salvar(t,ids[2],true,0,0);painel(t).andExpect(jsonPath("$.proximasAtividades.length()").value(1));
  http.perform(get("/api/dashboard").param("agora","2026-10-19T21:00:00").header("Authorization","Bearer "+t)).andExpect(jsonPath("$.proximasAtividades.length()").value(0));
 }
 @Test void segundoCursoTemPainelProprioSemApagarRegistros()throws Exception{
  String t=token("dashboard.troca@email.com");var antigo=edital();plano(t,antigo);salvar(t,antigo[2],true,10,8);
  jdbc.update("UPDATE edital SET titulo='Edital anterior' WHERE id=?",antigo[0]);var novo=edital();
  // Fora de um curso inscrito nao ha registro.
  http.perform(put("/api/dashboard/registros/"+novo[2]).header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"concluido\":true,\"questoes\":0,\"acertos\":0}")).andExpect(status().isBadRequest());
  plano(t,novo);
  // Sem edital o painel continua no curso em foco (o primeiro); com edital, abre o outro curso.
  painel(t).andExpect(jsonPath("$.editalId").value(antigo[0])).andExpect(jsonPath("$.progresso").value(50));
  http.perform(get("/api/dashboard").param("editalId",String.valueOf(novo[0])).header("Authorization","Bearer "+t))
   .andExpect(jsonPath("$.editalId").value(novo[0])).andExpect(jsonPath("$.progresso").value(0)).andExpect(jsonPath("$.disciplinas[0].questoes").value(0));
  salvar(t,novo[2],true,0,0);
  painel(t).andExpect(jsonPath("$.progresso").value(50)).andExpect(jsonPath("$.disciplinas[0].acertos").value(0));
 }
 @Test void percentualVazioEArredondamento(){assertThat(DashboardService.percentual(1,3)).isEqualTo(33.33);assertThat(DashboardService.percentual(0,0)).isZero();}
}
