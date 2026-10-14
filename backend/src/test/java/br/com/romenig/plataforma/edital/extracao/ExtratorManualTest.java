package br.com.romenig.plataforma.edital.extracao;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import org.junit.jupiter.api.Test;

class ExtratorManualTest {
    @Test
    void modoManualNaoFabricaConteudoEExigeRevisaoAntesDeAprovar() {
        var extrator = new FabricaDeExtratorIa().extratorManual();
        var conteudo = extrator.extrair(List.of("Texto do edital"));
        assertThat(conteudo.disciplinas()).isEmpty();
        assertThat(conteudo.concursos()).isEmpty();
        assertThat(new ValidadorDeEditalExtraido().validar(conteudo, 1))
                .extracting(erro -> erro.campo()).contains("titulo", "orgao", "ano", "disciplinas");
    }
}
