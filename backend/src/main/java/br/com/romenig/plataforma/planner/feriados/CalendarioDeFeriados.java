package br.com.romenig.plataforma.planner.feriados;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Feriados nacionais usados pelo cronograma (HU17).
 *
 * <p>Em producao vem da BrasilAPI ({@link FeriadosBrasilApi}); nos testes, de
 * uma lista em memoria. As implementacoes so dizem os feriados de um ano; a
 * semana (que pode cruzar a virada do ano) e montada aqui.
 */
public abstract class CalendarioDeFeriados {

    /** Feriados do ano, ou vazio se a fonte nao respondeu. */
    protected abstract Optional<List<Feriado>> doAno(int ano);

    public FeriadosDaSemana daSemana(LocalDate segunda) {
        LocalDate domingo = segunda.plusDays(6);
        List<Feriado> daSemana = new ArrayList<>();
        for (int ano = segunda.getYear(); ano <= domingo.getYear(); ano++) {
            Optional<List<Feriado>> feriados = doAno(ano);
            if (feriados.isEmpty()) {
                return FeriadosDaSemana.indisponivel();
            }
            feriados.get().stream()
                    .filter(f -> !f.data().isBefore(segunda) && !f.data().isAfter(domingo))
                    .forEach(daSemana::add);
        }
        daSemana.sort(Comparator.comparing(Feriado::data));
        return new FeriadosDaSemana(List.copyOf(daSemana), true);
    }
}
