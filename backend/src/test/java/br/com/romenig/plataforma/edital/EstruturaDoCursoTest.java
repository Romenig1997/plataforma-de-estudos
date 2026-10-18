package br.com.romenig.plataforma.edital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.planner.cronograma.GerarCronogramaRequest;
import br.com.romenig.plataforma.usuario.CodificadorDeSenha;
import tools.jackson.databind.ObjectMapper;

/**
 * Edicao da estrutura de um curso publicado pelo admin: incluir, renomear e
 * excluir disciplinas e topicos, apagando o que depende do item excluido
 * (cronograma, progresso, questoes e respostas) e ajustando o plano dos
 * inscritos.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class EstruturaDoCursoTest {

    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired CodificadorDeSenha senhas;
    @Autowired ObjectMapper json;
    @PersistenceContext EntityManager em;

    private String admin;
    private String aluno;
    private long alunoId;
    private long edital;
    private long portugues;
    private long direito;
    private long interpretacao;
    private long tipologia;
    private long crase;

    private String token(String email, String perfil) throws Exception {
        jdbc.update("INSERT INTO usuario(nome,email,senha_hash,perfil_id) VALUES('Pessoa',?,?,(SELECT id FROM perfil WHERE nome=?))",
                email, senhas.codificar("senha1234"), perfil);
        String resposta = http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "senha", "senha1234"))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(resposta).path("token").asText();
    }

    private long id(String sql, Object... parametros) {
        return jdbc.queryForObject(sql, Long.class, parametros);
    }

    private long contar(String sql, Object... parametros) {
        em.flush();
        return jdbc.queryForObject(sql, Long.class, parametros);
    }

    /** Curso com duas disciplinas; Portugues tem um assunto com dois subassuntos e outro assunto solto. */
    @BeforeEach
    void preparar() throws Exception {
        admin = token("admin.estrutura@email.com", "ADMIN");
        aluno = token("aluno.estrutura@email.com", "ALUNO");
        alunoId = id("SELECT id FROM usuario WHERE email='aluno.estrutura@email.com'");

        jdbc.update("INSERT INTO edital(titulo,orgao,ano) VALUES('Curso estrutura','Orgao',2026)");
        edital = id("SELECT id FROM edital WHERE titulo='Curso estrutura'");
        jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,'Portugues',2)", edital);
        portugues = id("SELECT id FROM disciplina WHERE edital_id=? AND nome='Portugues'", edital);
        jdbc.update("INSERT INTO disciplina(edital_id,nome,pagina) VALUES(?,'Direito',5)", edital);
        direito = id("SELECT id FROM disciplina WHERE edital_id=? AND nome='Direito'", edital);
        jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Interpretacao',2)", portugues);
        interpretacao = id("SELECT id FROM conteudo WHERE nome='Interpretacao' AND disciplina_id=?", portugues);
        jdbc.update("INSERT INTO conteudo(disciplina_id,pai_id,nome,pagina) VALUES(?,?,'Tipologia',2)", portugues, interpretacao);
        tipologia = id("SELECT id FROM conteudo WHERE nome='Tipologia' AND disciplina_id=?", portugues);
        jdbc.update("INSERT INTO conteudo(disciplina_id,pai_id,nome,pagina) VALUES(?,?,'Coesao',3)", portugues, interpretacao);
        jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Crase',4)", portugues);
        crase = id("SELECT id FROM conteudo WHERE nome='Crase' AND disciplina_id=?", portugues);
        jdbc.update("INSERT INTO conteudo(disciplina_id,nome,pagina) VALUES(?,'Constituicao',5)", direito);

        // Aluno inscrito, com cronograma, progresso e questao respondida no subassunto Tipologia.
        http.perform(post("/api/cursos/" + edital + "/inscricao").header("Authorization", "Bearer " + aluno)).andExpect(status().isOk());
        http.perform(put("/api/cronograma").header("Authorization", "Bearer " + aluno).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new GerarCronogramaRequest(LocalDate.of(2026, 10, 19),
                                List.of(new GerarCronogramaRequest.PeriodoDisponivel(1, LocalTime.of(8, 0), LocalTime.of(20, 0)))))))
                .andExpect(status().isOk());
        jdbc.update("INSERT INTO registro_estudo(usuario_id,conteudo_id,concluido,questoes,acertos,atualizado_em) VALUES(?,?,TRUE,0,0,CURRENT_TIMESTAMP)", alunoId, tipologia);
        jdbc.update("INSERT INTO questao(edital_id,conteudo_id,enunciado,gabarito,explicacao,publicada) VALUES(?,?,'Q?',0,'E',TRUE)", edital, tipologia);
        long questao = id("SELECT id FROM questao WHERE conteudo_id=?", tipologia);
        jdbc.update("INSERT INTO questao_alternativa(questao_id,ordem,texto) VALUES(?,0,'a'),(?,1,'b'),(?,2,'c'),(?,3,'d')", questao, questao, questao, questao);
        jdbc.update("INSERT INTO resposta_questao(usuario_id,questao_id,alternativa,correta,respondida_em) VALUES(?,?,0,TRUE,CURRENT_TIMESTAMP)", alunoId, questao);
        em.clear();
    }

    private MockHttpServletRequestBuilder comoAdmin(MockHttpServletRequestBuilder pedido, Object corpo) throws Exception {
        pedido.header("Authorization", "Bearer " + admin);
        if (corpo != null) pedido.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(corpo));
        return pedido;
    }

    private OffsetDateTime planoAtualizadoEm() {
        em.flush();
        return jdbc.queryForObject("SELECT atualizado_em FROM plano_estudo WHERE usuario_id=?", OffsetDateTime.class, alunoId);
    }

    @Test
    @DisplayName("excluir um assunto apaga subassuntos, cronograma, progresso, questoes e respostas")
    void excluirAssuntoApagaDependentes() throws Exception {
        assertThat(contar("SELECT count(*) FROM atividade_estudo a JOIN conteudo c ON c.id=a.conteudo_id WHERE c.pai_id=?", interpretacao)).isPositive();
        OffsetDateTime antes = planoAtualizadoEm();

        http.perform(comoAdmin(delete("/api/admin/editais/{e}/conteudos/{c}", edital, interpretacao), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplinas[0].assuntos.length()").value(1))
                .andExpect(jsonPath("$.disciplinas[0].assuntos[0].nome").value("Crase"));

        assertThat(contar("SELECT count(*) FROM conteudo WHERE id=? OR pai_id=?", interpretacao, interpretacao)).isZero();
        assertThat(contar("SELECT count(*) FROM registro_estudo WHERE usuario_id=?", alunoId)).isZero();
        assertThat(contar("SELECT count(*) FROM questao WHERE edital_id=?", edital)).isZero();
        assertThat(contar("SELECT count(*) FROM resposta_questao WHERE usuario_id=?", alunoId)).isZero();
        assertThat(contar("SELECT count(*) FROM atividade_estudo a JOIN conteudo c ON c.id=a.conteudo_id WHERE c.disciplina_id=?", portugues))
                .isEqualTo(contar("SELECT count(*) FROM atividade_estudo WHERE conteudo_id=?", crase));
        assertThat(planoAtualizadoEm()).isAfterOrEqualTo(antes);
    }

    @Test
    @DisplayName("excluir uma disciplina tira ela do plano e redistribui o tempo nas restantes")
    void excluirDisciplinaAjustaPlano() throws Exception {
        http.perform(comoAdmin(delete("/api/admin/editais/{e}/disciplinas/{d}", edital, portugues), null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplinas.length()").value(1))
                .andExpect(jsonPath("$.disciplinas[0].nome").value("Direito"));

        assertThat(contar("SELECT count(*) FROM disciplina WHERE id=?", portugues)).isZero();
        assertThat(contar("SELECT count(*) FROM plano_disciplina WHERE disciplina_id=?", portugues)).isZero();
        long meta = contar("SELECT meta_horas_semanais FROM plano_estudo WHERE usuario_id=?", alunoId);
        assertThat(contar("SELECT minutos_semanais FROM plano_disciplina WHERE disciplina_id=?", direito)).isEqualTo(meta * 60);
        assertThat(contar("SELECT count(*) FROM registro_estudo WHERE usuario_id=?", alunoId)).isZero();
        assertThat(contar("SELECT count(*) FROM atividade_estudo a JOIN conteudo c ON c.id=a.conteudo_id WHERE c.disciplina_id=?", portugues)).isZero();
    }

    @Test
    @DisplayName("incluir disciplina cria o primeiro assunto e entra no plano dos inscritos")
    void incluirDisciplinaEntraNoPlano() throws Exception {
        http.perform(comoAdmin(post("/api/admin/editais/{e}/disciplinas", edital), Map.of("nome", "Informatica", "primeiroAssunto", "Redes")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplinas.length()").value(3))
                .andExpect(jsonPath("$.disciplinas[2].nome").value("Informatica"))
                .andExpect(jsonPath("$.disciplinas[2].assuntos[0].nome").value("Redes"));

        long nova = id("SELECT id FROM disciplina WHERE edital_id=? AND nome='Informatica'", edital);
        assertThat(contar("SELECT count(*) FROM plano_disciplina WHERE disciplina_id=? AND prioridade='NORMAL'", nova)).isEqualTo(1);
    }

    @Test
    @DisplayName("inclui subassunto, renomeia topico e disciplina")
    void incluiERenomeia() throws Exception {
        http.perform(comoAdmin(post("/api/admin/editais/{e}/disciplinas/{d}/conteudos", edital, portugues), Map.of("nome", "Uso facultativo", "paiId", crase)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplinas[0].assuntos[1].subassuntos[0].nome").value("Uso facultativo"))
                .andExpect(jsonPath("$.disciplinas[0].assuntos[1].subassuntos[0].pagina").value(4));

        http.perform(comoAdmin(put("/api/admin/editais/{e}/conteudos/{c}", edital, crase), Map.of("nome", "Crase e acentuacao")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplinas[0].assuntos[1].nome").value("Crase e acentuacao"));

        http.perform(comoAdmin(put("/api/admin/editais/{e}/disciplinas/{d}", edital, direito), Map.of("nome", "Direito Constitucional")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disciplinas[1].nome").value("Direito Constitucional"));
    }

    @Test
    @DisplayName("recusa nome repetido, subassunto dentro de subassunto e estrutura vazia")
    void regrasDaEstrutura() throws Exception {
        http.perform(comoAdmin(post("/api/admin/editais/{e}/disciplinas", edital), Map.of("nome", "portugues", "primeiroAssunto", "X")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.erros[0].campo").value("nome"));
        http.perform(comoAdmin(post("/api/admin/editais/{e}/disciplinas/{d}/conteudos", edital, portugues), Map.of("nome", "Nivel 3", "paiId", tipologia)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.erros[0].campo").value("paiId"));
        http.perform(comoAdmin(post("/api/admin/editais/{e}/disciplinas", edital), Map.of("nome", "", "primeiroAssunto", "")))
                .andExpect(status().isBadRequest());

        long constituicao = id("SELECT id FROM conteudo WHERE disciplina_id=?", direito);
        http.perform(comoAdmin(delete("/api/admin/editais/{e}/conteudos/{c}", edital, constituicao), null))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.erros[0].campo").value("conteudo"));

        http.perform(comoAdmin(delete("/api/admin/editais/{e}/disciplinas/{d}", edital, direito), null)).andExpect(status().isOk());
        http.perform(comoAdmin(delete("/api/admin/editais/{e}/disciplinas/{d}", edital, portugues), null))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.erros[0].campo").value("disciplina"));
    }

    @Test
    @DisplayName("ALUNO nao edita a estrutura")
    void alunoRecebe403() throws Exception {
        http.perform(delete("/api/admin/editais/{e}/disciplinas/{d}", edital, portugues).header("Authorization", "Bearer " + aluno))
                .andExpect(status().isForbidden());
        assertThat(contar("SELECT count(*) FROM disciplina WHERE id=?", portugues)).isEqualTo(1);
    }
}
