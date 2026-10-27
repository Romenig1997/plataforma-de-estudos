package br.com.romenig.plataforma.perfil;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.conta.ExclusaoDeContaService;
import br.com.romenig.plataforma.perfil.dto.AtualizaPerfilRequest;
import br.com.romenig.plataforma.perfil.dto.PerfilResponse;
import jakarta.validation.Valid;

/**
 * Endpoints da HU03 - Gerenciamento de Perfis.
 *
 * <p>Nao ha regra de autorizacao explicita aqui: o {@code SecurityFilterChain}
 * ja exige autenticacao em qualquer rota que nao esteja no {@code permitAll}
 * (que so cobre cadastro e login). Diferenciar o que ADMIN e ALUNO podem
 * fazer e escopo da HU04.
 */
@RestController
@RequestMapping("/api/perfil")
public class PerfilController {

    private final PerfilService perfil;
    private final ExclusaoDeContaService exclusao;

    public PerfilController(PerfilService perfil, ExclusaoDeContaService exclusao) {
        this.perfil = perfil;
        this.exclusao = exclusao;
    }

    @GetMapping
    public PerfilResponse buscar() {
        return perfil.buscar();
    }

    @PutMapping
    public PerfilResponse atualizar(@RequestBody @Valid AtualizaPerfilRequest requisicao) {
        return perfil.atualizar(requisicao);
    }

    /** O aluno exclui a propria conta e todos os dados dela (HU16). */
    @DeleteMapping
    public ResponseEntity<Void> excluirConta() {
        exclusao.excluirPropriaConta();
        return ResponseEntity.noContent().build();
    }
}
