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
    private final PerfilRepository perfis;
    private final CodificadorDeSenha codificador;

    public CadastroUsuarioService(UsuarioRepository usuarios, PerfilRepository perfis,
                                  CodificadorDeSenha codificador) {
        this.usuarios = usuarios;
        this.perfis = perfis;
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
                codificador.codificar(requisicao.senha()),
                perfilDeAluno());

        return CadastroUsuarioResponse.de(usuarios.save(usuario));
    }

    /**
     * Todo cadastro nasce ALUNO (criterio da HU04). Desde a HU05 o perfil e
     * uma linha da tabela {@code perfil}, semeada pela migration V2; se ela
     * faltar, as migrations nao rodaram e falhar e melhor do que gravar uma
     * conta sem perfil.
     */
    private Perfil perfilDeAluno() {
        return perfis.findByNome(Perfil.ALUNO)
                .orElseThrow(() -> new IllegalStateException(
                        "Perfil '" + Perfil.ALUNO + "' ausente: as migrations do Flyway nao foram aplicadas."));
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