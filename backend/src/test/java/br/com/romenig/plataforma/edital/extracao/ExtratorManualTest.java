package br.com.romenig.plataforma.edital.extracao;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import org.junit.jupiter.api.Test;

class ExtratorManualTest {
    @Test
    void modoManualSugereUmaDisciplinaSemChamarUmProvedorExterno() {
        var extrator = new FabricaDeExtratorIa().extratorManual(new ExtratorLocalDeEdital());
        var conteudo = extrator.extrair(List.of("EDITAL 2026\nPREFEITURA DE EXEMPLO\nLINGUA PORTUGUESA"));
        assertThat(conteudo.disciplinas()).singleElement().extracting(item -> item.nome())
                .isEqualTo("Língua Portuguesa");
        assertThat(new ValidadorDeEditalExtraido().validar(conteudo, 1)).isEmpty();
    }
}
