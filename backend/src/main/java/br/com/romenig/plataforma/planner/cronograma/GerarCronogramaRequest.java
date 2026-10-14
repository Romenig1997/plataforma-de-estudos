package br.com.romenig.plataforma.planner.cronograma;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record GerarCronogramaRequest(
        @NotNull(message = "Informe a semana do cronograma.") LocalDate semanaInicio,
        @NotEmpty(message = "Informe seus dias e horarios disponiveis.") List<@NotNull @Valid PeriodoDisponivel> disponibilidades) {
    public record PeriodoDisponivel(
            @Min(1) @Max(7) int diaSemana,
            @NotNull(message = "Informe o horario inicial.") LocalTime inicio,
            @NotNull(message = "Informe o horario final.") LocalTime fim) { }
}
