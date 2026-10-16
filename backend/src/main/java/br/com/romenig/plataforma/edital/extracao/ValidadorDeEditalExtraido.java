package br.com.romenig.plataforma.edital.extracao;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

import br.com.romenig.plataforma.usuario.dto.RespostaDeErro.ErroValidacao;

/**
 * Valida a estrutura extraida antes da aprovacao (HU07, incremento A).
 *
 * <p>E logica pura e deterministica sobre {@link EditalExtraido}: nome vazio,
 * pagina fora do intervalo real do PDF, hierarquia quebrada (subassunto sem
 * pai nao existe aqui - subassunto e sempre filho de assunto) e duplicidade
 * dentro do mesmo nivel. O campo de cada erro e o caminho na arvore
 * (ex.: {@code disciplinas[0].assuntos[1].nome}), o mesmo formato que o
 * frontend usa para exibir proximo ao campo.
 */
@Component
public class ValidadorDeEditalExtraido {

    public List<ErroValidacao> validar(EditalExtraido edital, int totalPaginas) {
        List<ErroValidacao> erros = new ArrayList<>();

        validarIdentificacao(edital, erros);

        List<EditalExtraido.DisciplinaExtraido> disciplinas = edital.disciplinas();
        if (disciplinas == null || disciplinas.isEmpty()) {
            erros.add(new ErroValidacao("disciplinas", "O edital precisa de ao menos uma disciplina."));
            return erros;
        }

        Set<String> nomesDeDisciplina = new HashSet<>();
        for (int i = 0; i < disciplinas.size(); i++) {
            validarDisciplina(disciplinas.get(i), i, totalPaginas, nomesDeDisciplina, erros);
        }

        validarConcursos(edital.concursos(), erros);

        return erros;
    }

    private void validarIdentificacao(EditalExtraido edital, List<ErroValidacao> erros) {
        if (emBranco(edital.titulo())) {
            erros.add(new ErroValidacao("titulo", "Informe o titulo do edital."));
        }
        if (emBranco(edital.orgao())) {
            erros.add(new ErroValidacao("orgao", "Informe o orgao que promove o edital."));
        }
        Integer ano = edital.ano();
        if (ano == null || ano < 1900 || ano > 2100) {
            erros.add(new ErroValidacao("ano", "Informe o ano do edital (1900 a 2100)."));
        }
    }

    private void validarDisciplina(EditalExtraido.DisciplinaExtraido disciplina, int indice,
                                   int totalPaginas, Set<String> nomesJaVistos, List<ErroValidacao> erros) {
        String caminho = "disciplinas[" + indice + "]";

        if (!nomeValidoEUnico(disciplina.nome(), caminho + ".nome", nomesJaVistos, erros)) {
            return;
        }
        validarPagina(disciplina.pagina(), totalPaginas, caminho + ".pagina", erros);

        List<EditalExtraido.AssuntoExtraido> assuntos = disciplina.assuntos();
        if (assuntos == null || assuntos.isEmpty()) {
            erros.add(new ErroValidacao(caminho + ".assuntos",
                    "Inclua pelo menos um tópico nesta disciplina."));
            return;
        }

        Set<String> nomesDeAssuntos = new HashSet<>();
        for (int j = 0; j < assuntos.size(); j++) {
            String caminhoDoAssunto = caminho + ".assuntos[" + j + "]";
            EditalExtraido.AssuntoExtraido assunto = assuntos.get(j);

            if (!nomeValidoEUnico(assunto.nome(), caminhoDoAssunto + ".nome", nomesDeAssuntos, erros)) {
                continue;
            }
            validarPagina(assunto.pagina(), totalPaginas, caminhoDoAssunto + ".pagina", erros);

            List<EditalExtraido.SubassuntoExtraido> subassuntos = assunto.subassuntos();
            if (subassuntos == null) {
                continue;
            }

            Set<String> nomesDeSubassuntos = new HashSet<>();
            for (int k = 0; k < subassuntos.size(); k++) {
                EditalExtraido.SubassuntoExtraido subassunto = subassuntos.get(k);
                String caminhoDoSubassunto = caminhoDoAssunto + ".subassuntos[" + k + "]";

                if (!nomeValidoEUnico(subassunto.nome(), caminhoDoSubassunto + ".nome", nomesDeSubassuntos, erros)) {
                    continue;
                }
                validarPagina(subassunto.pagina(), totalPaginas, caminhoDoSubassunto + ".pagina", erros);
            }
        }
    }

    private void validarConcursos(List<EditalExtraido.ConcursoExtraido> concursos, List<ErroValidacao> erros) {
        if (concursos == null) {
            return;
        }

        Set<String> nomesDeConcursos = new HashSet<>();
        for (int i = 0; i < concursos.size(); i++) {
            EditalExtraido.ConcursoExtraido concurso = concursos.get(i);
            String caminho = "concursos[" + i + "]";

            if (!nomeValidoEUnico(concurso.nome(), caminho + ".nome", nomesDeConcursos, erros)) {
                continue;
            }

            List<EditalExtraido.CargoExtraido> cargos = concurso.cargos();
            if (cargos == null) {
                continue;
            }

            Set<String> nomesDeCargos = new HashSet<>();
            for (int j = 0; j < cargos.size(); j++) {
                EditalExtraido.CargoExtraido cargo = cargos.get(j);
                if (!nomeValidoEUnico(cargo.nome(), caminho + ".cargos[" + j + "].nome", nomesDeCargos, erros)) {
                    // sem retorno: o concurso continua valido com os demais cargos
                }
            }
        }
    }

    /**
     * @return {@code true} quando o nome e valido (nao em branco, sem
     *         duplicidade no nivel) - e so valida a pagina quando o nome passou,
     *         para o erro nao misturar dois problemas no mesmo no.
     */
    private boolean nomeValidoEUnico(String nome, String campo, Set<String> nomesJaVistos, List<ErroValidacao> erros) {
        if (emBranco(nome)) {
            erros.add(new ErroValidacao(campo, "Informe o nome."));
            return false;
        }

        String normalizado = nome.trim().toLowerCase(Locale.ROOT);
        if (!nomesJaVistos.add(normalizado)) {
            erros.add(new ErroValidacao(campo, "Ja existe um item com esse nome neste nivel."));
            return false;
        }
        return true;
    }

    private void validarPagina(int pagina, int totalPaginas, String campo, List<ErroValidacao> erros) {
        if (pagina < 1 || pagina > totalPaginas) {
            erros.add(new ErroValidacao(campo, "Pagina deve estar entre 1 e " + totalPaginas + "."));
        }
    }

    private boolean emBranco(String valor) {
        return valor == null || valor.trim().isEmpty();
    }
}
