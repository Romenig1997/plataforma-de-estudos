package br.com.romenig.plataforma.usuario;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.usuario.dto.CadastroUsuarioRequest;
import br.com.romenig.plataforma.usuario.dto.CadastroUsuarioResponse;
import br.com.romenig.plataforma.usuario.exception.EmailJaCadastradoException;

@Service
public class CadastroUsuarioService {

    private final UsuarioRepository usuarios;
    private final CodificadorDeSenha codificador;

    public CadastroUsuarioService(UsuarioRepository usuarios, CodificadorDeSenha codificador) {
        this.usuarios = usuarios;
        this.codificador = codificador;
    }

    @Transactional
    public CadastroUsuarioResponse cadastrar(CadastroUsuarioRequest requisicao) {
        String email = normalizarEmail(requisicao.email());

        if (usuarios.existsByEmail(email)) {
            throw new EmailJaCadastradoException();
        }

        Usuario usuario = new Usuario(
                requisicao.nome().trim(),
                email,
                codificador.codificar(requisicao.senha()));

        return CadastroUsuarioResponse.de(usuarios.save(usuario));
    }

    /**
     * E-mail e unico e as pessoas digitam maiusculas, espacos e acentos sem
     * querer. Sem esta normalizacao, "Ana@Email.com" e "ana@email.com" seriam
     * usuarios distintos e a regra de e-mail duplicado seria furada.
     */
    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}