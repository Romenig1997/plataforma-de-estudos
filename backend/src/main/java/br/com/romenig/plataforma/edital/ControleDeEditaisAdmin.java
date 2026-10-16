package br.com.romenig.plataforma.edital;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Gestao dos cursos (editais aprovados) - area exclusiva do ADMIN (regra em
 * {@code /api/admin/**}).
 *
 * <p>A exclusao pelo id do edital cobre os cursos que nao tem importacao
 * ligada; os demais tambem podem sair por aqui. O id aceita so digitos para
 * nao disputar caminho com {@code /api/admin/editais/importacoes}.
 */
@RestController
@RequestMapping("/api/admin/editais")
public class ControleDeEditaisAdmin {

    private final ImportacaoDeEditalService servico;

    public ControleDeEditaisAdmin(ImportacaoDeEditalService servico) {
        this.servico = servico;
    }

    @DeleteMapping("/{editalId:\\d+}")
    public ResponseEntity<Void> excluir(@PathVariable Long editalId) {
        servico.excluirEdital(editalId);
        return ResponseEntity.noContent().build();
    }
}
