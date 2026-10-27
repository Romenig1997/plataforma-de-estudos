package br.com.romenig.plataforma.planner.cronograma;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.ContasDeTeste;
import br.com.romenig.plataforma.planner.GerarPlanoRequest;
import br.com.romenig.plataforma.planner.Prioridade;
import br.com.romenig.plataforma.planner.feriados.Feriado;
import br.com.romenig.plataforma.planner.feriados.FeriadosEmMemoria;
import tools.jackson.databind.ObjectMapper;

/** HU17: o cronograma nao planeja sessoes em feriado nacional. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CronogramaComFeriadosTest {

    /** Segunda-feira, 02/11/2026: Finados. */
    private static final LocalDate SEMANA = LocalDate.of(2026, 11, 2);

    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired FeriadosEmMemoria feriados;

    @AfterEach
    void limparFeriados() {
        feriados.limpar();
    }

    @Test
    void naoPlanejaSessaoNoFeriadoEUsaOsOutrosDias() throws Exception {
        feriados.definir(List.of(new Feriado(SEMANA, "Finados")));
        String token = alunoComPlanoDeDuasHoras("feriado.outros.dias@email.com");

        gerar(token, List.of(periodo(1, "19:00", "21:00"), periodo(2, "19:00", "21:00")))
                .andExpect(jsonPath("$.feriados[0].data").value("2026-11-02"))
                .andExpect(jsonPath("$.feriados[0].nome").value("Finados"))
                .andExpect(jsonPath("$.feriadosIndisponiveis").value(false))
                .andExpect(jsonPath("$.minutosSemHorario").value(0))
                .andExpect(jsonPath("$.atividades[?(@.data == '2026-11-02')]").isEmpty())
                .andExpect(jsonPath("$.atividades[0].data").value("2026-11-03"));
    }

    @Test
    void tempoQueCaiNoFeriadoFicaSemHorarioEAvisado() throws Exception {
        feriados.definir(List.of(new Feriado(SEMANA, "Finados")));
        String token = alunoComPlanoDeDuasHoras("feriado.sem.horario@email.com");

        gerar(token, List.of(periodo(1, "19:00", "21:00")))
                .andExpect(jsonPath("$.atividades").isEmpty())
                .andExpect(jsonPath("$.minutosSemHorario").value(120));

        // A leitura posterior traz os mesmos feriados.
        http.perform(get("/api/cronograma").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feriados[0].nome").value("Finados"));
    }

    @Test
    void semCalendarioOCronogramaSaiNormalEAvisa() throws Exception {
        feriados.simularFalha();
        String token = alunoComPlanoDeDuasHoras("feriado.api.fora@email.com");

        gerar(token, List.of(periodo(1, "19:00", "21:00")))
                .andExpect(jsonPath("$.feriadosIndisponiveis").value(true))
                .andExpect(jsonPath("$.feriados").isEmpty())
                .andExpect(jsonPath("$.atividades[0].data").value("2026-11-02"));
    }

    @Test
    void semanaSemFeriadoNaoMudaNada() throws Exception {
        String token = alunoComPlanoDeDuasHoras("feriado.nenhum@email.com");

        gerar(token, List.of(periodo(1, "19:00", "21:00")))
                .andExpect(jsonPath("$.feriados").isEmpty())
                .andExpect(jsonPath("$.minutosSemHorario").value(0));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM atividade_estudo", Integer.class)).isEqualTo(2);
    }

    // -----------------------------------------------------------------------

    private String alunoComPlanoDeDuasHoras(String email) throws Exception {
        String token = ContasDeTeste.aluno(jdbc, email);
        jdbc.update("INSERT INTO edital(titulo, orgao, ano) VALUES(?, 'Orgao', 2026)", email);
        long edital = jdbc.queryForObject("SELECT id FROM edital WHERE titulo = ?", Long.class, email);
        jdbc.update("INSERT INTO disciplina(edital_id, nome, pagina) VALUES(?, 'Portugues', 2)", edital);
        long disciplina = jdbc.queryForObject("SELECT id FROM disciplina WHERE edital_id = ?", Long.class, edital);
        jdbc.update("INSERT INTO conteudo(disciplina_id, nome, pagina) VALUES(?, 'Interpretacao', 2)", disciplina);
        http.perform(put("/api/planner").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new GerarPlanoRequest(edital, 2,
                                List.of(new GerarPlanoRequest.PrioridadeDisciplina(disciplina, Prioridade.NORMAL))))))
                .andExpect(status().isOk());
        return token;
    }

    private GerarCronogramaRequest.PeriodoDisponivel periodo(int dia, String inicio, String fim) {
        return new GerarCronogramaRequest.PeriodoDisponivel(dia, LocalTime.parse(inicio), LocalTime.parse(fim));
    }

    private org.springframework.test.web.servlet.ResultActions gerar(String token, List<GerarCronogramaRequest.PeriodoDisponivel> periodos)
            throws Exception {
        return http.perform(put("/api/cronograma").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new GerarCronogramaRequest(SEMANA, periodos))))
                .andExpect(status().isOk());
    }
}
