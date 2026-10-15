package br.com.romenig.plataforma.planner;

import java.time.OffsetDateTime;
import java.util.*;
import br.com.romenig.plataforma.edital.dto.EditalResponse;

public record PlanoResponse(Long id, int metaHorasSemanais, OffsetDateTime atualizadoEm,
        EditalResponse edital, List<DisciplinaPlanejada> disciplinas, boolean emFoco) {
    public record DisciplinaPlanejada(Long disciplinaId, String nome, Prioridade prioridade, int minutosSemanais) { }
    public static PlanoResponse de(PlanoEstudo plano) {
        return new PlanoResponse(plano.getId(), plano.getMetaHorasSemanais(), plano.getAtualizadoEm(),
                EditalResponse.de(plano.getEdital()), plano.getDisciplinas().stream()
                .sorted(Comparator.comparing(d -> d.getDisciplina().getId()))
                .map(d -> new DisciplinaPlanejada(d.getDisciplina().getId(), d.getDisciplina().getNome(),
                        d.getPrioridade(), d.getMinutos())).toList(), plano.isEmFoco());
    }
}
