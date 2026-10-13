package br.com.romenig.plataforma.edital;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.edital.dto.EditalResponse;

/**
 * Editais aprovados para qualquer usuario autenticado (HU07, criterio 3).
 *
 * <p>E a leitura que a tela do planner consome: o aluno escolhe um edital e o
 * sistema monta o plano a partir de suas disciplinas e conteudos. A rota vive
 * fora de {@code /api/admin/**} de proposito: ALUNO e ADMIN podem ler, mas
 * nao é por aqui que se importa ou aprova edital.
 */
@RestController
@RequestMapping("/api/editais")
public class ControleDeEditais {

    private final ImportacaoDeEditalService servico;

    public ControleDeEditais(ImportacaoDeEditalService servico) {
        this.servico = servico;
    }

    @GetMapping
    public List<EditalResponse> listarAprovados() {
        return servico.listarAprovados();
    }
}