package br.com.romenig.plataforma.planner.cronograma;

import static org.assertj.core.api.Assertions.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
import br.com.romenig.plataforma.planner.cronograma.GerarCronogramaRequest.PeriodoDisponivel;

class GeradorCronogramaTest {
    private final GeradorCronograma gerador = new GeradorCronograma();
    private final LocalDate semana = LocalDate.of(2026,10,19);
    private PeriodoDisponivel periodo(int dia, String inicio, String fim) { return new PeriodoDisponivel(dia,LocalTime.parse(inicio),LocalTime.parse(fim)); }
    private GeradorCronograma.DisciplinaEntrada disciplina(long id, int minutos, Long... conteudos) { return new GeradorCronograma.DisciplinaEntrada(id,minutos,List.of(conteudos)); }

    @Test void respeitaHorariosTempoPorDisciplinaELimiteDasSessoes() {
        var periodos = List.of(periodo(3,"20:00","21:00"),periodo(1,"19:00","20:30"));
        var resultado = gerador.gerar(semana,periodos,List.of(disciplina(1,100,11L,12L),disciplina(2,50,21L)));
        assertThat(resultado.sessoes()).hasSize(4);
        Map<Long,Integer> minutos = new HashMap<>();
        for(var sessao : resultado.sessoes()) {
            int duracao=(int)Duration.between(sessao.inicio(),sessao.fim()).toMinutes();
            assertThat(duracao).isBetween(1,60);
            minutos.merge(sessao.disciplinaId(),duracao,Integer::sum);
            assertThat(periodos).anyMatch(p -> sessao.data().getDayOfWeek().getValue()==p.diaSemana()
                    && !sessao.inicio().isBefore(p.inicio()) && !sessao.fim().isAfter(p.fim()));
        }
        assertThat(minutos).containsEntry(1L,100).containsEntry(2L,50);
        assertThat(resultado.sessoes().stream().map(GeradorCronograma.Sessao::conteudoId)).contains(11L,12L,21L);
        for(int i=1;i<resultado.sessoes().size();i++) {
            var antes=resultado.sessoes().get(i-1); var atual=resultado.sessoes().get(i);
            if(antes.data().equals(atual.data())) assertThat(atual.inicio()).isAfterOrEqualTo(antes.fim());
        }
    }
    @Test void disponibilidadeInsuficienteNaoGeraAgendaParcial() {
        assertThatThrownBy(() -> gerador.gerar(semana,List.of(periodo(1,"19:00","19:59")),List.of(disciplina(1,60,11L))))
                .isInstanceOf(ErroDePlanoException.class).hasMessageContaining("meta exige 60");
    }
    @Test void rejeitaSobreposicaoEHorarioInvertidoMasAceitaIntervalosAdjacentes() {
        var disciplinas=List.of(disciplina(1,120,11L));
        assertThatThrownBy(() -> gerador.gerar(semana,List.of(periodo(1,"19:00","21:00"),periodo(1,"20:00","22:00")),disciplinas)).hasMessageContaining("sobrepor");
        assertThatThrownBy(() -> gerador.gerar(semana,List.of(periodo(1,"21:00","19:00")),disciplinas)).hasMessageContaining("inicio antes do fim");
        assertThat(gerador.gerar(semana,List.of(periodo(1,"19:00","20:00"),periodo(1,"20:00","21:00")),disciplinas).sessoes()).hasSize(2);
    }
    @Test void exigeInicioNaSegundaEConteudosDoEdital() {
        assertThatThrownBy(() -> gerador.gerar(semana.plusDays(1),List.of(periodo(1,"19:00","20:00")),List.of(disciplina(1,60,11L)))).hasMessageContaining("segunda-feira");
        assertThatThrownBy(() -> gerador.gerar(semana,List.of(periodo(1,"19:00","20:00")),List.of(disciplina(1,60)))).hasMessageContaining("conteudos");
    }
    @Test void preservaOsMinutosEmJanelasCurtasEAlternaTopicos() {
        var resultado=gerador.gerar(semana,List.of(periodo(1,"19:00","19:10"),periodo(2,"19:00","20:05")),List.of(disciplina(1,75,11L,12L)));
        assertThat(resultado.sessoes()).extracting(GeradorCronograma.Sessao::conteudoId).containsExactly(11L,12L,11L);
        assertThat(resultado.sessoes().stream().mapToLong(s -> Duration.between(s.inicio(),s.fim()).toMinutes()).sum()).isEqualTo(75);
    }
}
