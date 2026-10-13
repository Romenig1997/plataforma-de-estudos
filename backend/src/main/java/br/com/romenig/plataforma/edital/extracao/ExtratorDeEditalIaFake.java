package br.com.romenig.plataforma.edital.extracao;

import java.util.ArrayList;
import java.util.List;

/**
 * Implementacao deterministica de {@link ExtratorDeEditalIA} usada apenas em
 * teste ({@code plataforma.ia.tipo: fake}).
 *
 * <p>Devolve uma arvore fixa, com paginas calculadas para cair dentro do
 * intervalo real do documento - assim os testes de integracao exercitam o
 * fluxo completo (upload, validacao, revisao, aprovacao) sem depender de rede
 * nem de custo de chamada de IA. O conteudo nao varia com o texto recebido:
 * o que se testa aqui e o pipeline, nao a extracao.
 */
public class ExtratorDeEditalIaFake implements ExtratorDeEditalIA {

    @Override
    public EditalExtraido extrair(List<String> textoPorPagina) {
        int total = Math.max(textoPorPagina.size(), 1);

        int paginaUm = 1;
        int paginaDois = Math.min(2, total);

        return new EditalExtraido(
                "Concurso Publico Exemplo",
                "Prefeitura de Exemplo",
                2026,
                List.of(new EditalExtraido.ConcursoExtraido(
                        "Concurso Unico",
                        List.of(new EditalExtraido.CargoExtraido("Professor"),
                                new EditalExtraido.CargoExtraido("Motorista")))),
                new ArrayList<>(List.of(
                        new EditalExtraido.DisciplinaExtraido(
                                "Lingua Portuguesa",
                                paginaUm,
                                List.of(new EditalExtraido.AssuntoExtraido(
                                        "Interpretacao de texto", paginaUm,
                                        List.of(new EditalExtraido.SubassuntoExtraido("Generos textuais", paginaUm))),
                                        new EditalExtraido.AssuntoExtraido("Morfologia", paginaDois, List.of()))),
                        new EditalExtraido.DisciplinaExtraido(
                                "Matematica",
                                paginaDois,
                                List.of(new EditalExtraido.AssuntoExtraido("Operacoes basicas", paginaDois, List.of()))))));
    }
}