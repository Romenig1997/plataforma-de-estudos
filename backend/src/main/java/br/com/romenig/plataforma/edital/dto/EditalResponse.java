package br.com.romenig.plataforma.edital.dto;

import java.time.OffsetDateTime;
import java.util.List;

import br.com.romenig.plataforma.edital.Concurso;
import br.com.romenig.plataforma.edital.Conteudo;
import br.com.romenig.plataforma.edital.Disciplina;
import br.com.romenig.plataforma.edital.Edital;

/**
 * Edital aprovado como a API entrega para o planner (HU07, criterio 3):
 * a arvore completa de disciplinas e concursos que a geracao de atividades
 * (incremento C) percorre.
 *
 * <p>Assuntos tem {@code subassuntos} (filhos); subassuntos nao descem mais
 * niveis. Concursos listam seus cargos. A pagina de cada no preserva a
 * referencia de origem no PDF da importacao.
 */
public record EditalResponse(
        Long id,
        String titulo,
        String orgao,
        Integer ano,
        OffsetDateTime criadoEm,
        String materialPdfUrl,
        boolean possuiPdfOriginal,
        List<DisciplinaResponse> disciplinas,
        List<ConcursoResponse> concursos) {

    public record DisciplinaResponse(Long id, String nome, Integer pagina, List<ConteudoResponse> assuntos) {
    }

    public record ConteudoResponse(Long id, String nome, Integer pagina, List<ConteudoResponse> subassuntos) {
    }

    public record ConcursoResponse(Long id, String nome, List<CargoResponse> cargos) {
    }

    public record CargoResponse(Long id, String nome) {
    }

    public static EditalResponse de(Edital edital) {
        return new EditalResponse(
                edital.getId(),
                edital.getTitulo(),
                edital.getOrgao(),
                edital.getAno(),
                edital.getCriadoEm(),
                edital.getMaterialPdfUrl(),
                edital.getPdf() != null,
                edital.getDisciplinas().stream().map(EditalResponse::de).toList(),
                edital.getConcursos().stream().map(EditalResponse::deConcurso).toList());
    }

    private static DisciplinaResponse de(Disciplina disciplina) {
        List<Conteudo> todos = disciplina.getConteudos();
        List<ConteudoResponse> assuntos = todos.stream()
                .filter(conteudo -> conteudo.getPai() == null)
                .map(assunto -> deConteudo(assunto, todos))
                .toList();

        return new DisciplinaResponse(disciplina.getId(), disciplina.getNome(),
                disciplina.getPagina(), assuntos);
    }

    private static ConteudoResponse deConteudo(Conteudo assunto, List<Conteudo> todos) {
        List<ConteudoResponse> subassuntos = todos.stream()
                .filter(candidato -> candidato.getPai() != null
                        && assunto.getId() != null
                        && assunto.getId().equals(candidato.getPai().getId()))
                .map(EditalResponse::deConteudoFolha)
                .toList();

        return new ConteudoResponse(assunto.getId(), assunto.getNome(),
                assunto.getPagina(), subassuntos);
    }

    private static ConteudoResponse deConteudoFolha(Conteudo subassunto) {
        return new ConteudoResponse(subassunto.getId(), subassunto.getNome(),
                subassunto.getPagina(), List.of());
    }

    private static ConcursoResponse deConcurso(Concurso concurso) {
        var cargos = concurso.getCargos().stream()
                .map(cargo -> new CargoResponse(cargo.getId(), cargo.getNome()))
                .toList();

        return new ConcursoResponse(concurso.getId(), concurso.getNome(), cargos);
    }
}
