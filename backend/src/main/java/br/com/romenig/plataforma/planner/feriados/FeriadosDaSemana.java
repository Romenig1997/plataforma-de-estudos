package br.com.romenig.plataforma.planner.feriados;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Feriados de uma semana do cronograma.
 *
 * @param feriados   feriados entre a segunda e o domingo, em ordem
 * @param disponivel {@code false} quando o calendario nao respondeu: o
 *                   cronograma sai normalmente, sem considerar feriados, e o
 *                   aluno e avisado
 */
public record FeriadosDaSemana(List<Feriado> feriados, boolean disponivel) {

    public static FeriadosDaSemana indisponivel() {
        return new FeriadosDaSemana(List.of(), false);
    }

    public Set<LocalDate> datas() {
        return feriados.stream().map(Feriado::data).collect(Collectors.toUnmodifiableSet());
    }
}
