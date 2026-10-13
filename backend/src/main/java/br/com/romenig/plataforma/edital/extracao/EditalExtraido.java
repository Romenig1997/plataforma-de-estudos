package br.com.romenig.plataforma.edital.extracao;

import java.util.List;

/**
 * Estrutura extraida de um edital (HU07, incremento A) - o contrato JSON que a
 * IA deve devolver e que voce revisa antes de aprovar a importacao.
 *
 * <p>O documento academico nao define o formato de saida, entao esta arvore e
 * uma definicao de implementacao (a menor que atende o criterio 3): o edital
 * identificado (titulo/orgao/ano), seus concursos com cargos, e as disciplinas
 * com assuntos e subassuntos. Cada item de conteudo preserva a
 * {@code pagina} de origem no PDF.
 *
 * <p>E um record Jackson limpo: o mesmo tipo que a IA produz e serializado em
 * {@code importacao_edital.conteudo_extraido}, rehidratado na revisao e devolvido
 * nas respostas da API.
 */
public record EditalExtraido(
        String titulo,
        String orgao,
        Integer ano,
        List<ConcursoExtraido> concursos,
        List<DisciplinaExtraido> disciplinas) {

    public record ConcursoExtraido(String nome, List<CargoExtraido> cargos) {
    }

    public record CargoExtraido(String nome) {
    }

    public record DisciplinaExtraido(String nome, int pagina, List<AssuntoExtraido> assuntos) {
    }

    public record AssuntoExtraido(String nome, int pagina, List<SubassuntoExtraido> subassuntos) {
    }

    public record SubassuntoExtraido(String nome, int pagina) {
    }
}