package br.com.romenig.plataforma.admin;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.admin.dto.UsuarioAdminResponse;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Area administrativa da HU04.
 *
 * <p>So e chamado em {@code /api/admin/**}, rota que o
 * {@code SecurityFilterChain} restringe a quem tem a authority {@code ADMIN}
 * (perfil gravado no banco e refletido no token — ver copia no
 * {@code FiltroDeTokenJwt}). O ALUNO recebe 403 do
 * {@code ErroDeAutenticacaoHandler} antes de chegar aqui.
 *
 * <p>Ao listar usuarios, a resposta e montada no DTO na mao: o
 * {@code senha_hash} da entidade jamais atravessa a serializacao.
 */
@Service
public class AdminService {

    private final UsuarioRepository usuarios;

    public AdminService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> listarUsuarios() {
        return usuarios.findAll().stream()
                .map(UsuarioAdminResponse::de)
                .toList();
    }
}