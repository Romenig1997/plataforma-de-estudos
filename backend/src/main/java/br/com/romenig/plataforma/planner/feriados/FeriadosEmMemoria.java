package br.com.romenig.plataforma.planner.feriados;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Feriados definidos pelo proprio teste ({@code plataforma.feriados.tipo=memoria}).
 * Comeca vazio, para nao mudar os cronogramas dos demais testes. Nunca e
 * usado em producao.
 */
@Component
@ConditionalOnProperty(name = "plataforma.feriados.tipo", havingValue = "memoria")
public class FeriadosEmMemoria extends CalendarioDeFeriados {

    private final List<Feriado> feriados = new ArrayList<>();
    private boolean fora = false;

    @Override
    protected Optional<List<Feriado>> doAno(int ano) {
        if (fora) {
            return Optional.empty();
        }
        return Optional.of(feriados.stream().filter(f -> f.data().getYear() == ano).toList());
    }

    public void definir(List<Feriado> novos) {
        feriados.clear();
        feriados.addAll(novos);
        fora = false;
    }

    public void simularFalha() {
        fora = true;
    }

    public void limpar() {
        feriados.clear();
        fora = false;
    }
}
