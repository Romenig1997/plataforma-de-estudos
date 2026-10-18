package br.com.romenig.plataforma.questao;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import br.com.romenig.plataforma.ContasDeTeste;
import tools.jackson.databind.ObjectMapper;
@SpringBootTest @AutoConfigureMockMvc @Transactional
class QuestaoTest {
 @Autowired MockMvc http;@Autowired JdbcTemplate jdbc;@Autowired ObjectMapper json;
 String token(String email,String perfil)throws Exception{
  return ContasDeTeste.criar(jdbc, "Teste", email, perfil);
 }
 long[] edital(){
  jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES('Edital questoes','Orgao',2026)");long e=jdbc.queryForObject("SELECT id FROM edital WHERE titulo='Edital questoes'",Long.class);
  jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,'Portugues',2),(?,'Matematica',3)",e,e);var d=jdbc.queryForList("SELECT id FROM disciplina WHERE edital_id=? ORDER BY id",Long.class,e);
  jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Textos',2),(?,'Numeros',3)",d.get(0),d.get(1));var c=jdbc.queryForList("SELECT id FROM conteudo WHERE disciplina_id IN (?,?) ORDER BY id",Long.class,d.get(0),d.get(1));return new long[]{e,d.get(0),d.get(1),c.get(0),c.get(1)};
 }
 void plano(String t,long[] ids)throws Exception{http.perform(put("/api/planner").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"editalId\":"+ids[0]+",\"metaHorasSemanais\":2,\"prioridades\":[{\"disciplinaId\":"+ids[1]+",\"prioridade\":\"NORMAL\"},{\"disciplinaId\":"+ids[2]+",\"prioridade\":\"NORMAL\"}]}" )).andExpect(status().isOk());}
 QuestaoRequest request(long e,long c){return new QuestaoRequest(e,c,"Qual alternativa?",List.of("Primeira","Segunda","Terceira","Quarta"),0,"A primeira é correta.");}
 long criar(String t,long e,long c)throws Exception{return json.readTree(http.perform(post("/api/admin/questoes").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request(e,c)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("id").asLong();}
 void publicar(String t,long q)throws Exception{http.perform(post("/api/admin/questoes/"+q+"/publicar").header("Authorization","Bearer "+t)).andExpect(status().isOk());}
 org.springframework.test.web.servlet.ResultActions responder(String t,long q,int a)throws Exception{return http.perform(post("/api/questoes/"+q+"/resposta").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content("{\"alternativa\":"+a+",\"correta\":true}"));}
 @Test void adminExclusivoERotasProtegidas()throws Exception{http.perform(get("/api/questoes")).andExpect(status().isUnauthorized());String aluno=token("q.aluno@email.com","ALUNO");http.perform(get("/api/admin/questoes").param("editalId","1").header("Authorization","Bearer "+aluno)).andExpect(status().isForbidden());http.perform(post("/api/admin/questoes").header("Authorization","Bearer "+aluno).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isForbidden());}
 @Test void rascunhoOcultoEGabaritoSomenteDepoisDaResposta()throws Exception{
  var ids=edital();String admin=token("q.admin@email.com","ADMIN"),aluno=token("q.a@email.com","ALUNO");plano(aluno,ids);long q=criar(admin,ids[0],ids[3]);
  http.perform(get("/api/questoes").header("Authorization","Bearer "+aluno)).andExpect(jsonPath("$.length()").value(0));publicar(admin,q);
  http.perform(get("/api/questoes").header("Authorization","Bearer "+aluno)).andExpect(jsonPath("$[0].alternativas.length()").value(4)).andExpect(jsonPath("$[0].gabarito").doesNotExist()).andExpect(jsonPath("$[0].explicacao").doesNotExist()).andExpect(jsonPath("$[0].resposta").doesNotExist());
  responder(aluno,q,1).andExpect(status().isOk()).andExpect(jsonPath("$.correta").value(false)).andExpect(jsonPath("$.gabarito").value(0)).andExpect(jsonPath("$.explicacao").value("A primeira é correta."));
 }
 @Test void integraCorrecaoDashboardEAnaliseSemTotaisManuais()throws Exception{
  var ids=edital();String admin=token("q.admin2@email.com","ADMIN"),aluno=token("q.b@email.com","ALUNO");plano(aluno,ids);
  // Tres respostas por topico: o minimo para o topico entrar em "onde focar".
  for(int i=0;i<3;i++){long q=criar(admin,ids[0],ids[3]),m=criar(admin,ids[0],ids[4]);publicar(admin,q);publicar(admin,m);responder(aluno,q,1).andExpect(status().isOk());responder(aluno,m,0).andExpect(status().isOk()).andExpect(jsonPath("$.correta").value(true));}
  http.perform(get("/api/dashboard").header("Authorization","Bearer "+aluno)).andExpect(jsonPath("$.disciplinas[0].questoes").value(3)).andExpect(jsonPath("$.disciplinas[0].desempenho").value(0)).andExpect(jsonPath("$.disciplinas[1].desempenho").value(100)).andExpect(jsonPath("$.progresso").value(0));
  http.perform(get("/api/analise").header("Authorization","Bearer "+aluno)).andExpect(jsonPath("$.analise.desempenhoGeral").value(50)).andExpect(jsonPath("$.analise.comparacaoDisponivel").value(true))
   .andExpect(jsonPath("$.analise.disciplinas[0].abaixoDosDemais").value(true)).andExpect(jsonPath("$.analise.topicos.length()").value(2))
   .andExpect(jsonPath("$.analise.recomendacoes.length()").value(1)).andExpect(jsonPath("$.analise.recomendacoes[0].conteudoId").value(ids[3])).andExpect(jsonPath("$.analise.recomendacoes[0].conteudo").value("Textos")).andExpect(jsonPath("$.analise.recomendacoes[0].disciplinaId").value(ids[1]));
 }
 @Test void refazerGuardaTentativasEDesempenhoUsaAUltima()throws Exception{
  var ids=edital();String admin=token("q.admin3@email.com","ADMIN"),aluno=token("q.c@email.com","ALUNO");plano(aluno,ids);long q=criar(admin,ids[0],ids[3]);publicar(admin,q);
  responder(aluno,q,1).andExpect(status().isOk()).andExpect(jsonPath("$.correta").value(false));
  http.perform(get("/api/questoes").header("Authorization","Bearer "+aluno)).andExpect(jsonPath("$[0].resposta.alternativa").value(1)).andExpect(jsonPath("$[0].tentativas").value(1));
  responder(aluno,q,0).andExpect(status().isOk()).andExpect(jsonPath("$.correta").value(true));
  assertThat(jdbc.queryForObject("SELECT count(*) FROM resposta_questao WHERE questao_id=?",Integer.class,q)).isEqualTo(2);
  http.perform(get("/api/questoes").header("Authorization","Bearer "+aluno)).andExpect(jsonPath("$[0].resposta.alternativa").value(0)).andExpect(jsonPath("$[0].resposta.correta").value(true)).andExpect(jsonPath("$[0].tentativas").value(2));
  // A ultima tentativa substitui a anterior no painel: 1 questao, 100%.
  http.perform(get("/api/dashboard").header("Authorization","Bearer "+aluno)).andExpect(jsonPath("$.disciplinas[0].questoes").value(1)).andExpect(jsonPath("$.disciplinas[0].desempenho").value(100));
 }
 @Test void respostasIsoladasPorAluno()throws Exception{
  var ids=edital();String admin=token("q.admin4@email.com","ADMIN"),a=token("q.d@email.com","ALUNO"),b=token("q.e@email.com","ALUNO");plano(a,ids);plano(b,ids);long q=criar(admin,ids[0],ids[3]);publicar(admin,q);responder(a,q,0).andExpect(status().isOk());
  http.perform(get("/api/questoes").header("Authorization","Bearer "+b)).andExpect(jsonPath("$[0].resposta").doesNotExist());http.perform(get("/api/dashboard").header("Authorization","Bearer "+b)).andExpect(jsonPath("$.disciplinas[0].questoes").value(0));responder(b,q,1).andExpect(status().isOk());http.perform(get("/api/dashboard").header("Authorization","Bearer "+a)).andExpect(jsonPath("$.disciplinas[0].desempenho").value(100));
 }
 @Test void publicadaImutavelRascunhoEditavel()throws Exception{
  var ids=edital();String t=token("q.admin5@email.com","ADMIN");long q=criar(t,ids[0],ids[3]);var r=new QuestaoRequest(ids[0],ids[3],"Novo enunciado",List.of("A","B","C","D"),1,"Explicação revisada");
  http.perform(put("/api/admin/questoes/"+q).header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(r))).andExpect(status().isOk()).andExpect(jsonPath("$.questao.gabarito").value(1));publicar(t,q);http.perform(put("/api/admin/questoes/"+q).header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(r))).andExpect(status().isConflict());
 }
 @Test void validaTopicoAlternativasEIndiceERecusaRascunhoOuOutroEdital()throws Exception{
  var ids=edital();String t=token("q.admin6@email.com","ADMIN"),a=token("q.f@email.com","ALUNO");plano(a,ids);long q=criar(t,ids[0],ids[3]);responder(a,q,0).andExpect(status().isBadRequest());publicar(t,q);responder(a,q,4).andExpect(status().isBadRequest());
  http.perform(post("/api/admin/questoes").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(new QuestaoRequest(ids[0],ids[3],"Texto",List.of("A","A","B","C"),0,"Explicação")))).andExpect(status().isBadRequest());
  http.perform(post("/api/admin/questoes").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(request(ids[0],999999)))).andExpect(status().isBadRequest());
  jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES('Outro','Orgao',2026)");long outro=jdbc.queryForObject("SELECT id FROM edital WHERE titulo='Outro'",Long.class);jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,'Outra',1)",outro);long d=jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id=?",Long.class,outro);jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Outro topico',1)",d);long c=jdbc.queryForObject("SELECT id FROM conteudo WHERE disciplina_id=?",Long.class,d);long fora=criar(t,outro,c);publicar(t,fora);responder(a,fora,0).andExpect(status().isBadRequest());
 }
 @Test void importaLoteSomenteComoRascunhos()throws Exception{var ids=edital();String t=token("q.admin7@email.com","ADMIN");http.perform(post("/api/admin/questoes/lote").header("Authorization","Bearer "+t).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(new QuestaoController.Lote(List.of(request(ids[0],ids[3]),request(ids[0],ids[4])))))).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].publicada").value(false));}
}
