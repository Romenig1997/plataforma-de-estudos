package br.com.romenig.plataforma.planner;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import org.junit.jupiter.api.Test;

class DistribuidorSemanalTest {
    private final DistribuidorSemanal distribuidor = new DistribuidorSemanal();
    private DistribuidorSemanal.Entrada entrada(long id, Prioridade prioridade) { return new DistribuidorSemanal.Entrada(id, prioridade); }

    @Test void divideProporcionalmenteAosPesos() {
        var resultado = distribuidor.distribuir(6, List.of(entrada(1, Prioridade.BAIXA), entrada(2, Prioridade.NORMAL), entrada(3, Prioridade.ALTA)));
        assertThat(resultado).extracting(DistribuidorSemanal.Parcela::minutos).containsExactly(60, 120, 180);
    }
    @Test void arredondamentoPreservaMetaEDesempateEstavel() {
        var prioridades = List.of(entrada(3, Prioridade.NORMAL), entrada(1, Prioridade.NORMAL), entrada(2, Prioridade.NORMAL), entrada(4, Prioridade.NORMAL), entrada(5, Prioridade.NORMAL), entrada(6, Prioridade.NORMAL), entrada(7, Prioridade.NORMAL));
        var parcelas = distribuidor.distribuir(1, prioridades);
        assertThat(parcelas.stream().mapToInt(DistribuidorSemanal.Parcela::minutos).sum()).isEqualTo(60);
        assertThat(parcelas).extracting(DistribuidorSemanal.Parcela::minutos).containsExactly(9, 9, 9, 9, 8, 8, 8);
        var inversas = new java.util.ArrayList<>(prioridades);
        java.util.Collections.reverse(inversas);
        assertThat(distribuidor.distribuir(1, inversas)).isEqualTo(parcelas);
    }
    @Test void metaMaximaEVariasDisciplinasSempreFechamExatamente() {
        for (int quantidade = 1; quantidade <= 40; quantidade++) {
            var entradas = new java.util.ArrayList<DistribuidorSemanal.Entrada>();
            for (int i = 0; i < quantidade; i++) entradas.add(entrada(i + 1, Prioridade.values()[i % 3]));
            for (int horas : List.of(1, 17, 168)) {
                var resultado = distribuidor.distribuir(horas, entradas);
                assertThat(resultado.stream().mapToInt(DistribuidorSemanal.Parcela::minutos).sum()).isEqualTo(horas * 60);
                assertThat(resultado).allMatch(p -> p.minutos() >= 0);
            }
        }
    }
}
