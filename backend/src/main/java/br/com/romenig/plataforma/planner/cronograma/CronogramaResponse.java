package br.com.romenig.plataforma.planner.cronograma;

import java.time.*;
import java.util.*;
import br.com.romenig.plataforma.planner.PlanoEstudo;
import br.com.romenig.plataforma.planner.feriados.Feriado;
import br.com.romenig.plataforma.planner.feriados.FeriadosDaSemana;

/**
 * Cronograma combinado. {@code editalTitulo} e mantido para o frontend antigo
 * (titulos dos cursos juntos); {@code cursos} detalha cada curso da agenda.
 *
 * <p>HU17: {@code feriados} lista os feriados nacionais da semana;
 * {@code feriadosIndisponiveis} indica que a BrasilAPI nao respondeu e a
 * agenda nao considerou feriados; {@code minutosSemHorario} e o tempo da
 * meta que ficou sem sessao porque caiu em feriado.
 */
public record CronogramaResponse(Long id, LocalDate semanaInicio, int metaHorasSemanais, String editalTitulo,
        boolean desatualizado, OffsetDateTime geradoEm, List<GerarCronogramaRequest.PeriodoDisponivel> disponibilidades,
        List<Atividade> atividades, List<Curso> cursos, List<Feriado> feriados, boolean feriadosIndisponiveis,
        int minutosSemHorario) {
    public record Atividade(Long id, LocalDate data, LocalTime inicio, LocalTime fim, Long disciplinaId,
            String disciplina, Long conteudoId, String conteudo, int pagina, Long editalId, boolean concluido) { }
    public record Curso(Long editalId, String titulo, int metaHorasSemanais) { }

    /** {@code concluidos}: topicos ja concluidos pelo aluno, para marcar as sessoes feitas. */
    public static CronogramaResponse de(CronogramaEstudo cronograma, List<PlanoEstudo> planosAtuais, Set<Long> concluidos,
                                        FeriadosDaSemana feriados) {
        var cursos = cronograma.getPlanos().stream().sorted(Comparator.comparing(PlanoEstudo::getId))
                .map(p -> new Curso(p.getEdital().getId(), p.getEdital().getTitulo(), p.getMetaHorasSemanais())).toList();
        return new CronogramaResponse(cronograma.getId(), cronograma.getSemanaInicio(), cronograma.getMetaHorasSemanais(),
                String.join(" + ", cursos.stream().map(Curso::titulo).toList()), cronograma.isDesatualizado(planosAtuais), cronograma.getGeradoEm(),
                cronograma.getDisponibilidades().stream().sorted(Comparator.comparingInt(DisponibilidadeEstudo::getDiaSemana).thenComparing(DisponibilidadeEstudo::getInicio))
                .map(d -> new GerarCronogramaRequest.PeriodoDisponivel(d.getDiaSemana(),d.getInicio(),d.getFim())).toList(),
                cronograma.getAtividades().stream().sorted(Comparator.comparing(AtividadeEstudo::getData).thenComparing(AtividadeEstudo::getInicio))
                .map(a -> atividade(a, concluidos.contains(a.getConteudo().getId()))).toList(), cursos,
                feriados.feriados(), !feriados.disponivel(), minutosSemHorario(cronograma));
    }

    private static int minutosSemHorario(CronogramaEstudo cronograma) {
        long agendados = cronograma.getAtividades().stream()
                .mapToLong(a -> Duration.between(a.getInicio(), a.getFim()).toMinutes()).sum();
        return (int) Math.max(0, cronograma.getMetaHorasSemanais() * 60L - agendados);
    }

    public static Atividade atividade(AtividadeEstudo a) { return atividade(a, false); }

    public static Atividade atividade(AtividadeEstudo a, boolean concluido) {
        return new Atividade(a.getId(), a.getData(), a.getInicio(), a.getFim(), a.getDisciplina().getId(),
                a.getDisciplina().getNome(), a.getConteudo().getId(), a.getConteudo().getNome(), a.getConteudo().getPagina(),
                a.getDisciplina().getEdital().getId(), concluido);
    }
}
