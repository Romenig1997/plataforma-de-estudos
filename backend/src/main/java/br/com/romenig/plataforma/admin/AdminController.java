package br.com.romenig.plataforma.admin;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.admin.dto.UsuarioAdminResponse;

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

    /** Lista as contas cadastradas — a area restrita minima que a HU04 demonstra. */
    @GetMapping("/usuarios")
    public List<UsuarioAdminResponse> listarUsuarios() {
        return admin.listarUsuarios();
    }
}