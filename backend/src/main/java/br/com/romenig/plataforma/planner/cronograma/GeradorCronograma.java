package br.com.romenig.plataforma.planner.cronograma;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
import br.com.romenig.plataforma.planner.cronograma.GerarCronogramaRequest.PeriodoDisponivel;

/** Agenda em minutos, sem sobreposicoes, percorrendo disciplinas e topicos em ciclos. */
@Component
public class GeradorCronograma {
    public record DisciplinaEntrada(Long id, int minutos, List<Long> conteudos) { }
    public record Sessao(LocalDate data, LocalTime inicio, LocalTime fim, Long disciplinaId, Long conteudoId) { }
    public record Resultado(List<PeriodoDisponivel> periodos, List<Sessao> sessoes) { }

    public Resultado gerar(LocalDate semana, List<PeriodoDisponivel> periodos, List<DisciplinaEntrada> disciplinas) {
        return gerar(semana, periodos, disciplinas, Set.of());
    }

    /**
     * Mesma agenda, sem sessoes nos {@code feriados} (HU17). A meta continua
     * conferida contra a disponibilidade da semana normal: numa semana com
     * feriado, o tempo daquele dia simplesmente fica sem horario.
     */
    public Resultado gerar(LocalDate semana, List<PeriodoDisponivel> periodos, List<DisciplinaEntrada> disciplinas,
                           Set<LocalDate> feriados) {
        if (semana.getDayOfWeek() != DayOfWeek.MONDAY)
            throw new ErroDePlanoException("semanaInicio", "Escolha uma segunda-feira para iniciar a semana.");
        var ordenados = new ArrayList<>(periodos);
        ordenados.sort(Comparator.comparingInt(PeriodoDisponivel::diaSemana).thenComparing(PeriodoDisponivel::inicio));
        int disponivel = 0;
        PeriodoDisponivel anterior = null;
        for (var periodo : ordenados) {
            if (periodo.diaSemana() < 1 || periodo.diaSemana() > 7 || !periodo.inicio().isBefore(periodo.fim())
                    || periodo.inicio().getSecond() != 0 || periodo.fim().getSecond() != 0
                    || periodo.inicio().getNano() != 0 || periodo.fim().getNano() != 0)
                throw new ErroDePlanoException("disponibilidades", "Informe intervalos no mesmo dia, com inicio antes do fim e horarios em minutos.");
            if (anterior != null && anterior.diaSemana() == periodo.diaSemana() && periodo.inicio().isBefore(anterior.fim()))
                throw new ErroDePlanoException("disponibilidades", "Os horarios disponiveis nao podem se sobrepor no mesmo dia.");
            disponivel += (int) Duration.between(periodo.inicio(), periodo.fim()).toMinutes();
            anterior = periodo;
        }
        var entradas = disciplinas.stream().filter(d -> d.minutos() > 0).sorted(Comparator.comparing(DisciplinaEntrada::id)).toList();
        int necessario = entradas.stream().mapToInt(DisciplinaEntrada::minutos).sum();
        if (disponivel < necessario)
            throw new ErroDePlanoException("disponibilidades", "Sua disponibilidade e de " + disponivel
                    + " minutos, mas a meta exige " + necessario + ". Ajuste os horarios ou a meta do plano semanal.");
        if (entradas.isEmpty()) throw new ErroDePlanoException("plano", "O plano semanal nao possui tempo distribuido.");
        for (var entrada : entradas) if (entrada.conteudos().isEmpty())
            throw new ErroDePlanoException("plano", "Todas as disciplinas planejadas precisam de conteudos no edital.");
        int[] restantes = entradas.stream().mapToInt(DisciplinaEntrada::minutos).toArray();
        int[] topicos = new int[entradas.size()];
        int proxima = 0, total = necessario;
        List<Sessao> sessoes = new ArrayList<>();
        for (var periodo : ordenados) {
            if (feriados.contains(semana.plusDays(periodo.diaSemana() - 1))) continue;
            int cursor = periodo.inicio().toSecondOfDay() / 60;
            int limite = periodo.fim().toSecondOfDay() / 60;
            while (cursor < limite && total > 0) {
                while (restantes[proxima] == 0) proxima = (proxima + 1) % entradas.size();
                var disciplina = entradas.get(proxima);
                int duracao = Math.min(60, Math.min(restantes[proxima], limite - cursor));
                Long conteudo = disciplina.conteudos().get(topicos[proxima] % disciplina.conteudos().size());
                sessoes.add(new Sessao(semana.plusDays(periodo.diaSemana() - 1), LocalTime.of(cursor / 60, cursor % 60),
                        LocalTime.of((cursor + duracao) / 60, (cursor + duracao) % 60), disciplina.id(), conteudo));
                cursor += duracao; restantes[proxima] -= duracao; total -= duracao; topicos[proxima]++;
                proxima = (proxima + 1) % entradas.size();
            }
            if (total == 0) break;
        }
        return new Resultado(List.copyOf(ordenados), List.copyOf(sessoes));
    }
}
