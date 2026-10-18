package br.com.romenig.plataforma.admin;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.admin.dto.AlterarPerfilRequest;
import br.com.romenig.plataforma.admin.dto.ResumoAdminResponse;
import br.com.romenig.plataforma.admin.dto.UsuarioAdminResponse;
import jakarta.validation.Valid;

/**
 * Endpoints da area administrativa da HU04.
 *
 * <p>A autorizacao nao esta aqui nem em annotation: a regra "(ADMIN)",
 * definida no {@code SecurityFilterChain} para {@code /api/admin/**}, e quem
 * deixa o ADMIN passar e responde 403 para o ALUNO.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService admin;

    public AdminController(AdminService admin) {
        this.admin = admin;
    }

    /** Lista as contas cadastradas. */
    @GetMapping("/usuarios")
    public List<UsuarioAdminResponse> listarUsuarios() {
        return admin.listarUsuarios();
    }

    /** Troca o perfil de acesso de outra conta (ADMIN ou ALUNO). */
    @PutMapping("/usuarios/{id}/perfil")
    public UsuarioAdminResponse alterarPerfil(@PathVariable Long id, @Valid @RequestBody AlterarPerfilRequest dados) {
        return admin.alterarPerfil(id, dados.perfil());
    }

    /** Indicadores da visao geral do painel. */
    @GetMapping("/resumo")
    public ResumoAdminResponse resumo() {
        return admin.resumo();
    }
}
