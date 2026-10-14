package br.com.romenig.plataforma.planner.cronograma;

import java.time.*;
import java.util.*;

public record CronogramaResponse(Long id, LocalDate semanaInicio, int metaHorasSemanais, String editalTitulo,
        boolean desatualizado, OffsetDateTime geradoEm, List<GerarCronogramaRequest.PeriodoDisponivel> disponibilidades,
        List<Atividade> atividades) {
    public record Atividade(Long id, LocalDate data, LocalTime inicio, LocalTime fim, Long disciplinaId,
            String disciplina, Long conteudoId, String conteudo, int pagina) { }
    public static CronogramaResponse de(CronogramaEstudo cronograma) {
        return new CronogramaResponse(cronograma.getId(), cronograma.getSemanaInicio(), cronograma.getMetaHorasSemanais(),
                cronograma.getEdital().getTitulo(), cronograma.isDesatualizado(), cronograma.getGeradoEm(),
                cronograma.getDisponibilidades().stream().sorted(Comparator.comparingInt(DisponibilidadeEstudo::getDiaSemana).thenComparing(DisponibilidadeEstudo::getInicio))
                .map(d -> new GerarCronogramaRequest.PeriodoDisponivel(d.getDiaSemana(),d.getInicio(),d.getFim())).toList(),
                cronograma.getAtividades().stream().sorted(Comparator.comparing(AtividadeEstudo::getData).thenComparing(AtividadeEstudo::getInicio))
                .map(a -> new Atividade(a.getId(),a.getData(),a.getInicio(),a.getFim(),a.getDisciplina().getId(),
                        a.getDisciplina().getNome(),a.getConteudo().getId(),a.getConteudo().getNome(),a.getConteudo().getPagina())).toList());
    }
}
