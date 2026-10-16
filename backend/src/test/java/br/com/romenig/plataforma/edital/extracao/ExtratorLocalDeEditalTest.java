package br.com.romenig.plataforma.edital.extracao;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;

class ExtratorLocalDeEditalTest {
    private final ExtratorLocalDeEdital extrator = new ExtratorLocalDeEdital();

    @Test
    void estruturaSumarioDeDireitoPenalEmDisciplinaAssuntosESubassuntos() {
        var edital = extrator.extrair(List.of(
                "MANUAL DE DIREITO PENAL\nPREFEITURA DE EXEMPLO\n2026",
                "SUMÁRIO\n1 Princípios Constitucionais do Direito Penal\n"
                        + "1.1 Conceitos introdutórios\n1.2 Princípio da legalidade penal\n"
                        + "2 Fontes do Direito Penal\n2.1 Fontes formais"));

        assertThat(edital.titulo()).isEqualTo("MANUAL DE DIREITO PENAL");
        assertThat(edital.orgao()).isEqualTo("PREFEITURA DE EXEMPLO");
        assertThat(edital.ano()).isEqualTo(2026);
        assertThat(edital.disciplinas()).singleElement().satisfies(disciplina -> {
            assertThat(disciplina.nome()).isEqualTo("Direito Penal");
            assertThat(disciplina.pagina()).isEqualTo(2);
            assertThat(disciplina.assuntos()).extracting(assunto -> assunto.nome())
                    .containsExactly("Princípios Constitucionais do Direito Penal", "Fontes do Direito Penal");
            assertThat(disciplina.assuntos().get(0).subassuntos()).extracting(subassunto -> subassunto.nome())
                    .containsExactly("Conceitos introdutórios", "Princípio da legalidade penal");
        });
    }

    @Test
    void criaEstruturaMinimaRevisavelQuandoNaoHaUmSumarioNumerado() {
        var edital = extrator.extrair(List.of("EDITAL DE ABERTURA\n2026\nINFORMÁTICA"));

        assertThat(edital.disciplinas()).singleElement().satisfies(disciplina -> {
            assertThat(disciplina.nome()).isEqualTo("Informática");
            assertThat(disciplina.assuntos()).singleElement()
                    .extracting(assunto -> assunto.nome()).isEqualTo("Conteúdo identificado no PDF");
        });
    }

    @Test
    void escolheDisciplinaPelaRelevanciaDaCapaEmVezDaOrdemDaListaConhecida() {
        var edital = extrator.extrair(List.of(
                "RESUMOS DE INFORMÁTICA\n2026",
                "português português português português português português\n"
                        + "1 - SOFTWARE"));

        assertThat(edital.disciplinas()).singleElement()
                .extracting(disciplina -> disciplina.nome()).isEqualTo("Informática");
    }

    @Test
    void usaAsPaginasIndicadasNoSumarioEmVezDaPaginaDoProprioSumario() {
        var edital = extrator.extrair(List.of(
                "MANUAL DE DIREITO PENAL\n2026",
                "SUMÁRIO\n1 Princípios do Direito Penal .... 5\n"
                        + "1.1 Princípio da legalidade .... 6",
                "Página de transição", "Página de transição", "1 Princípios do Direito Penal",
                "1.1 Princípio da legalidade"));

        var assunto = edital.disciplinas().get(0).assuntos().get(0);
        assertThat(assunto.pagina()).isEqualTo(5);
        assertThat(assunto.subassuntos()).singleElement()
                .extracting(subassunto -> subassunto.pagina()).isEqualTo(6);
    }

    @Test
    void resolveNoCorpoAsPaginasQueNaoVieramIndicadasNoSumario() {
        var edital = extrator.extrair(List.of(
                "MANUAL DE DIREITO PENAL\n2026",
                "SUMÁRIO\n1 Princípios do Direito Penal\n1.1 Princípio da legalidade",
                "Continuação do sumário", "Introdução", "1 Princípios do Direito Penal",
                "1.1 Princípio da legalidade"));

        var assunto = edital.disciplinas().get(0).assuntos().get(0);
        assertThat(assunto.pagina()).isEqualTo(5);
        assertThat(assunto.subassuntos()).singleElement()
                .extracting(subassunto -> subassunto.pagina()).isEqualTo(6);
    }

    @Test
    void reconheceSumarioProgramaticoEUsaAsPaginasFisicasDoCorpo() {
        var edital = extrator.extrair(List.of(
                "MANUAL DE DIREITO PENAL\n2026",
                "SUMÁRIO PROGRAMÁTICO\n1. Princípios do Direito Penal\n1.1. Princípio da legalidade",
                "2. Fontes do Direito Penal",
                "Texto introdutório",
                "1. Princípios do Direito Penal\n1.1. Princípio da legalidade",
                "2. Fontes do Direito Penal"));

        var assuntos = edital.disciplinas().get(0).assuntos();
        assertThat(assuntos).extracting(assunto -> assunto.pagina()).containsExactly(5, 6);
        assertThat(assuntos.get(0).subassuntos()).singleElement()
                .extracting(subassunto -> subassunto.pagina()).isEqualTo(5);
    }

    @Test
    void usaANumeracaoParaDistinguirTitulosRepetidosNoCorpo() {
        var edital = extrator.extrair(List.of(
                "MANUAL DE DIREITO PENAL\n2026",
                "SUMÁRIO\n1. Princípios\n1.1. Princípio da subsidiariedade\n"
                        + "2. Conflito aparente\n2.1. Princípio da subsidiariedade",
                "1. Princípios\n1.1. Princípio da subsidiariedade",
                "2. Conflito aparente\n2.1. Princípio da subsidiariedade"));

        var assuntos = edital.disciplinas().get(0).assuntos();
        assertThat(assuntos.get(0).subassuntos()).singleElement()
                .extracting(subassunto -> subassunto.pagina()).isEqualTo(3);
        assertThat(assuntos.get(1).subassuntos()).singleElement()
                .extracting(subassunto -> subassunto.pagina()).isEqualTo(4);
    }

    @Test
    void removePontosGuiaDoSumarioELocalizaCadaTopicoNoCorpoDoPdf() {
        var edital = extrator.extrair(List.of(
                "RESUMOS DE INFORMÁTICA\n2026",
                "SUMÁRIO\n1 - SOFTWARE ........................................\n"
                        + "2 - HARDWARE ........................................",
                "Apresentação do material",
                "1 - SOFTWARE\nConceitos e exemplos",
                "Continuação do primeiro tópico",
                "2 - HARDWARE\nComponentes do computador"));

        var assuntos = edital.disciplinas().get(0).assuntos();
        assertThat(assuntos).extracting(assunto -> assunto.nome())
                .containsExactly("SOFTWARE", "HARDWARE");
        assertThat(assuntos).extracting(assunto -> assunto.pagina()).containsExactly(4, 6);
    }

    @Test
    void continuaAteOCorpoMesmoQuandoOSumarioPassaDoLimiteDeItens() {
        String entradasDoSumario = IntStream.rangeClosed(1, 41)
                .mapToObj(numero -> numero + " - TÓPICO " + numero + " ........")
                .reduce((atual, proxima) -> atual + "\n" + proxima)
                .orElseThrow();

        var edital = extrator.extrair(List.of(
                "RESUMOS DE INFORMÁTICA\n2026",
                "SUMÁRIO\n" + entradasDoSumario,
                "1 - TÓPICO 1\nConteúdo do primeiro tópico"));

        var assuntos = edital.disciplinas().get(0).assuntos();
        assertThat(assuntos).hasSize(40);
        assertThat(assuntos.get(0).pagina()).isEqualTo(3);
    }

    @Test
    void reconheceIndiceComPontosGuiaMesmoSemAPalavraSumario() {
        var edital = extrator.extrair(List.of(
                "RESUMOS DE INFORMÁTICA\n2026",
                "1 - SOFTWARE ........................................\n"
                        + "2 - HARDWARE ........................................\n"
                        + "3 - NAVEGADORES ........................................",
                "Apresentação do material",
                "1 - SOFTWARE\nConteúdo do primeiro tópico",
                "Continuação",
                "2 - HARDWARE\nConteúdo do segundo tópico"));

        var assuntos = edital.disciplinas().get(0).assuntos();
        assertThat(assuntos).extracting(assunto -> assunto.pagina()).containsExactly(4, 6, 6);
    }

    @Test
    void naoConfundeNumeroDeTopicoComItemDeUmaListaInterna() {
        var edital = extrator.extrair(List.of(
                "RESUMOS DE INFORMÁTICA\n2026",
                "SUMÁRIO\n3 - NAVEGADORES ........................................",
                "3 - Mais leve que os discos rígidos convencionais.",
                "3 - NAVEGADORES\nConteúdo do tópico"));

        var assunto = edital.disciplinas().get(0).assuntos().get(0);
        assertThat(assunto.nome()).isEqualTo("NAVEGADORES");
        assertThat(assunto.pagina()).isEqualTo(4);
    }

    @Test
    void usaUmaPaginaDoCorpoParaTopicoSemCabecalhoExplicito() {
        var edital = extrator.extrair(List.of(
                "RESUMOS DE INFORMÁTICA\n2026",
                "SUMÁRIO\n1 - SOFTWARE ........................................\n"
                        + "2 - CONCEITOS DE TECNOLOGIA ........................................\n"
                        + "3 - HARDWARE ........................................",
                "1 - SOFTWARE\nConteúdo do primeiro tópico",
                "Conteúdo do tópico sem cabeçalho",
                "3 - HARDWARE\nConteúdo do terceiro tópico"));

        var assuntos = edital.disciplinas().get(0).assuntos();
        assertThat(assuntos).extracting(assunto -> assunto.pagina()).containsExactly(3, 4, 5);
    }
}
