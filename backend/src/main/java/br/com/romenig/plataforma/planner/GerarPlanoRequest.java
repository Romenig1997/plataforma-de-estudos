package br.com.romenig.plataforma.planner;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

public record GerarPlanoRequest(
        @NotNull @Positive Long editalId,
        @NotNull @Min(1) @Max(168) Integer metaHorasSemanais,
        @NotEmpty List<@NotNull @Valid PrioridadeDisciplina> prioridades) {
    public record PrioridadeDisciplina(@NotNull @Positive Long disciplinaId, @NotNull Prioridade prioridade) { }
}
