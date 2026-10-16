package br.com.romenig.plataforma.planner.cronograma;

import java.time.*;
import java.util.*;
import br.com.romenig.plataforma.planner.PlanoEstudo;

/**
 * Cronograma combinado. {@code editalTitulo} e mantido para o frontend antigo
 * (titulos dos cursos juntos); {@code cursos} detalha cada curso da agenda.
 */
public record CronogramaResponse(Long id, LocalDate semanaInicio, int metaHorasSemanais, String editalTitulo,
        boolean desatualizado, OffsetDateTime geradoEm, List<GerarCronogramaRequest.PeriodoDisponivel> disponibilidades,
        List<Atividade> atividades, List<Curso> cursos) {
    public record Atividade(Long id, LocalDate data, LocalTime inicio, LocalTime fim, Long disciplinaId,
            String disciplina, Long conteudoId, String conteudo, int pagina, Long editalId, boolean concluido) { }
    public record Curso(Long editalId, String titulo, int metaHorasSemanais) { }

    /** {@code concluidos}: topicos ja concluidos pelo aluno, para marcar as sessoes feitas. */
    public static CronogramaResponse de(CronogramaEstudo cronograma, List<PlanoEstudo> planosAtuais, Set<Long> concluidos) {
        var cursos = cronograma.getPlanos().stream().sorted(Comparator.comparing(PlanoEstudo::getId))
                .map(p -> new Curso(p.getEdital().getId(), p.getEdital().getTitulo(), p.getMetaHorasSemanais())).toList();
        return new CronogramaResponse(cronograma.getId(), cronograma.getSemanaInicio(), cronograma.getMetaHorasSemanais(),
                String.join(" + ", cursos.stream().map(Curso::titulo).toList()), cronograma.isDesatualizado(planosAtuais), cronograma.getGeradoEm(),
                cronograma.getDisponibilidades().stream().sorted(Comparator.comparingInt(DisponibilidadeEstudo::getDiaSemana).thenComparing(DisponibilidadeEstudo::getInicio))
                .map(d -> new GerarCronogramaRequest.PeriodoDisponivel(d.getDiaSemana(),d.getInicio(),d.getFim())).toList(),
                cronograma.getAtividades().stream().sorted(Comparator.comparing(AtividadeEstudo::getData).thenComparing(AtividadeEstudo::getInicio))
                .map(a -> atividade(a, concluidos.contains(a.getConteudo().getId()))).toList(), cursos);
    }

    public static Atividade atividade(AtividadeEstudo a) { return atividade(a, false); }

    public static Atividade atividade(AtividadeEstudo a, boolean concluido) {
        return new Atividade(a.getId(), a.getData(), a.getInicio(), a.getFim(), a.getDisciplina().getId(),
                a.getDisciplina().getNome(), a.getConteudo().getId(), a.getConteudo().getNome(), a.getConteudo().getPagina(),
                a.getDisciplina().getEdital().getId(), concluido);
    }
}
