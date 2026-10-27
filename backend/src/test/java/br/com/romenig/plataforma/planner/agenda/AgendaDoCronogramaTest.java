package br.com.romenig.plataforma.planner.agenda;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

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

/** HU18: o cronograma vira um calendario .ics assinado por um link secreto. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AgendaDoCronogramaTest {

    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;

    @Test
    void linkSecretoEntregaOCronogramaNoFormatoDeAgenda() throws Exception {
        String token = alunoComCronograma("agenda.ics@email.com");
        String caminho = caminhoDaAgenda(token);

        assertThat(caminho).matches("/api/agenda/[A-Za-z0-9_-]{43}\\.ics");
        assertThat(caminhoDaAgenda(token)).isEqualTo(caminho);

        // Sem cabecalho Authorization: e assim que o Google Agenda busca.
        String ics = http.perform(get(caminho))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "text/calendar;charset=UTF-8"))
                .andReturn().getResponse().getContentAsString();

        assertThat(ics).startsWith("BEGIN:VCALENDAR\r\n").endsWith("END:VCALENDAR\r\n");
        assertThat(ics.split("BEGIN:VEVENT", -1)).hasSize(3);
        // Segunda 19/10/2026, 19h em Sao Paulo = 22h UTC.
        assertThat(ics).contains("DTSTART:20261019T220000Z", "DTEND:20261019T230000Z",
                "SUMMARY:Língua Portuguesa: Crase\\, regência", "TRIGGER:-PT10M");
    }

    @Test
    void novoLinkInvalidaOAnterior() throws Exception {
        String token = alunoComCronograma("agenda.novo.link@email.com");
        String antigo = caminhoDaAgenda(token);

        String novo = json.readValue(http.perform(post("/api/cronograma/agenda/novo-link").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(), Map.class).get("caminho").toString();

        assertThat(novo).isNotEqualTo(antigo);
        http.perform(get(antigo)).andExpect(status().isNotFound());
        http.perform(get(novo)).andExpect(status().isOk());
    }

    @Test
    void linkDesconhecidoEPedidoSemLoginSaoRecusados() throws Exception {
        http.perform(get("/api/agenda/nao-existe.ics")).andExpect(status().isNotFound());
        http.perform(get("/api/cronograma/agenda")).andExpect(status().isUnauthorized());
    }

    @Test
    void semCronogramaOCalendarioVemVazioEValido() throws Exception {
        String token = ContasDeTeste.aluno(jdbc, "agenda.vazia@email.com");
        String ics = http.perform(get(caminhoDaAgenda(token))).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(ics).contains("BEGIN:VCALENDAR", "END:VCALENDAR").doesNotContain("BEGIN:VEVENT");
    }

    @Test
    void contaExcluidaDerrubaOLink() throws Exception {
        String token = alunoComCronograma("agenda.conta.excluida@email.com");
        String caminho = caminhoDaAgenda(token);

        http.perform(delete("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)).andExpect(status().isNoContent());
        http.perform(get(caminho)).andExpect(status().isNotFound());
    }

    // -----------------------------------------------------------------------

    private String caminhoDaAgenda(String token) throws Exception {
        String corpo = http.perform(get("/api/cronograma/agenda").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn().getResponse().getContentAsString();
        return json.readValue(corpo, Map.class).get("caminho").toString();
    }

    private String alunoComCronograma(String email) throws Exception {
        String token = ContasDeTeste.aluno(jdbc, email);
        jdbc.update("INSERT INTO edital(titulo, orgao, ano) VALUES(?, 'Orgao', 2026)", email);
        long edital = jdbc.queryForObject("SELECT id FROM edital WHERE titulo = ?", Long.class, email);
        jdbc.update("INSERT INTO disciplina(edital_id, nome, pagina) VALUES(?, 'Língua Portuguesa', 2)", edital);
        long disciplina = jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id = ?", Long.class, edital);
        jdbc.update("INSERT INTO conteudo(disciplina_id, nome, pagina) VALUES(?, 'Crase, regência', 7)", disciplina);
        http.perform(put("/api/planner").header(HttpHeaders.AUTHORIZATION, "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new GerarPlanoRequest(edital, 2,
                                List.of(new GerarPlanoRequest.PrioridadeDisciplina(disciplina, Prioridade.NORMAL))))))
                .andExpect(status().isOk());
        http.perform(put("/api/cronograma").header(HttpHeaders.AUTHORIZATION, "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new GerarCronogramaRequest(LocalDate.of(2026, 10, 19),
                                List.of(new GerarCronogramaRequest.PeriodoDisponivel(1, LocalTime.of(19, 0), LocalTime.of(21, 0)))))))
                .andExpect(status().isOk());
        return token;
    }
}
