package br.com.romenig.plataforma.edital.extracao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

import br.com.romenig.plataforma.edital.extracao.EditalExtraido.AssuntoExtraido;
import br.com.romenig.plataforma.edital.extracao.EditalExtraido.CargoExtraido;
import br.com.romenig.plataforma.edital.extracao.EditalExtraido.ConcursoExtraido;
import br.com.romenig.plataforma.edital.extracao.EditalExtraido.DisciplinaExtraido;
import br.com.romenig.plataforma.edital.extracao.EditalExtraido.SubassuntoExtraido;
import br.com.romenig.plataforma.usuario.dto.RespostaDeErro.ErroValidacao;

/**
 * Regras do ValidadorDeEditalExtraido (HU07, incremento A): identificacao,
 * pagina dentro do intervalo, hierarquia e duplicidade por nivel.
 */
class ValidadorDeEditalExtraidoTest {

    private final ValidadorDeEditalExtraido validador = new ValidadorDeEditalExtraido();

    @Test
    void aceitaUmEditalCompletoEValido() {
        List<ErroValidacao> erros = validador.validar(editalValido(), 12);

        assertTrue(erros.isEmpty());
    }

    @Test
    void rejeitaTituloOrgaoEAnoEmBrancoOuForaDoIntervalo() {
        EditalExtraido edital = editalValido();
        EditalExtraido invalido = new EditalExtraido(
                "  ", null, 1800, edital.concursos(), edital.disciplinas());

        List<ErroValidacao> erros = validador.validar(invalido, 12);

        assertEquals(3, erros.size());
        assertEquals("titulo", erros.get(0).campo());
        assertEquals("orgao", erros.get(1).campo());
        assertEquals("ano", erros.get(2).campo());
    }

    @Test
    void exigePeloMenosUmaDisciplina() {
        EditalExtraido semDisciplinas = new EditalExtraido(
                "Titulo", "Orgao", 2026, List.of(), List.of());

        List<ErroValidacao> erros = validador.validar(semDisciplinas, 12);

        assertEquals(1, erros.size());
        assertEquals("disciplinas", erros.get(0).campo());
    }

    @Test
    void rejeitaPaginaForaDoIntervaloReal() {
        EditalExtraido edital = new EditalExtraido(
                "Titulo", "Orgao", 2026, List.of(),
                List.of(new DisciplinaExtraido("Matematica", 0, List.of(new AssuntoExtraido("Aritmetica", 13, List.of())))));

        List<ErroValidacao> erros = validador.validar(edital, 12);

        assertEquals(2, erros.size());
        assertEquals("disciplinas[0].pagina", erros.get(0).campo());
        assertEquals("disciplinas[0].assuntos[0].pagina", erros.get(1).campo());
    }

    @Test
    void rejeitaNomeDuplicadoNoMesmoNivel() {
        EditalExtraido edital = new EditalExtraido(
                "Titulo", "Orgao", 2026, List.of(),
                List.of(new DisciplinaExtraido("Lingua Portuguesa", 1, List.of()),
                        new DisciplinaExtraido("lingua portuguesa ", 2, List.of())));

        List<ErroValidacao> erros = validador.validar(edital, 12);

        assertEquals(1, erros.size());
        assertEquals("disciplinas[1].nome", erros.get(0).campo());
    }

    @Test
    void rejeitaAssuntoComNomeEmBranco() {
        EditalExtraido edital = new EditalExtraido(
                "Titulo", "Orgao", 2026, List.of(),
                List.of(new DisciplinaExtraido("Matematica", 1,
                        List.of(new AssuntoExtraido("  ", 1, List.of())))));

        List<ErroValidacao> erros = validador.validar(edital, 12);

        assertEquals(1, erros.size());
        assertEquals("disciplinas[0].assuntos[0].nome", erros.get(0).campo());
    }

    @Test
    void rejeitaSubassuntoForaDaHierarquiaDePagina() {
        EditalExtraido edital = new EditalExtraido(
                "Titulo", "Orgao", 2026, List.of(),
                List.of(new DisciplinaExtraido("Matematica", 1,
                        List.of(new AssuntoExtraido("Aritmetica", 1,
                                List.of(new SubassuntoExtraido("Fracao", 30)))))));

        List<ErroValidacao> erros = validador.validar(edital, 12);

        assertEquals(1, erros.size());
        assertEquals("disciplinas[0].assuntos[0].subassuntos[0].pagina", erros.get(0).campo());
    }

    @Test
    void rejeitaCargoDuplicadoDentroDoMesmoConcurso() {
        EditalExtraido edital = new EditalExtraido(
                "Titulo", "Orgao", 2026,
                List.of(new ConcursoExtraido("Concurso Unico",
                        List.of(new CargoExtraido("Professor"), new CargoExtraido("professor")))),
                List.of(new DisciplinaExtraido("Matematica", 1, List.of())));

        List<ErroValidacao> erros = validador.validar(edital, 12);

        assertEquals(1, erros.size());
        assertEquals("concursos[0].cargos[1].nome", erros.get(0).campo());
    }

    private EditalExtraido editalValido() {
        return new EditalExtraido(
                "Concurso Publico Municipal",
                "Prefeitura de Exemplo",
                2026,
                List.of(new ConcursoExtraido("Concurso Unico",
                        List.of(new CargoExtraido("Professor"), new CargoExtraido("Motorista")))),
                List.of(new DisciplinaExtraido("Lingua Portuguesa", 1,
                                List.of(new AssuntoExtraido("Interpretacao de texto", 1,
                                        List.of(new SubassuntoExtraido("Generos textuais", 1))),
                                        new AssuntoExtraido("Morfologia", 2, List.of()))),
                        new DisciplinaExtraido("Matematica", 3,
                                List.of(new AssuntoExtraido("Operacoes basicas", 3, List.of())))));
    }
}