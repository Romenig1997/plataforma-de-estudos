package br.com.romenig.plataforma.perfil;

import java.util.Locale;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.perfil.dto.AtualizaPerfilRequest;
import br.com.romenig.plataforma.perfil.dto.PerfilResponse;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
import br.com.romenig.plataforma.usuario.exception.EmailJaCadastradoException;

/**
 * Gerenciamento de perfil da HU03: le e grava os dados do proprio usuario.
 *
 * <p>A identidade vem do {@code SecurityContext} - mesmo padrao de
 * {@code AutenticacaoService.sessaoAtual()}. So e chamado em endpoints que ja
 * passaram pelo {@code FiltroDeTokenJwt}, entao a sessao existe; o
 * {@link SessaoInvalidaException} e defensivo.
 *
 * <p>Nao ha regra por perfil aqui: ADMIN/ALUNO e escopo da HU04. Hoje todo
 * usuario autenticado pode ler e editar o proprio perfil.
 */
@Service
public class PerfilService {

    private final UsuarioRepository usuarios;

    public PerfilService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public PerfilResponse buscar() {
        return PerfilResponse.de(usuarioDaSessao());
    }

    @Transactional
    public PerfilResponse atualizar(AtualizaPerfilRequest requisicao) {
        Usuario usuario = usuarioDaSessao();

        String email = normalizarEmail(requisicao.email());
        if (!email.equalsIgnoreCase(usuario.getEmail()) && usuarios.existsByEmail(email)) {
            throw new EmailJaCadastradoException();
        }

        usuario.atualizarPerfil(
                requisicao.nome().trim(),
                email,
                requisicao.metaEstudoSemanal(),
                normalizarObjetivo(requisicao.objetivoMotivacao()));

        return PerfilResponse.de(usuario);
    }

    /**
     * Mesma normalizacao do cadastro (HU01): trim + minusculas. Sem ela,
     * "Ana@Email.com" passaria a ser um e-mail diferente do cadastrado e a
     * constraint de unicidade nao pegaria.
     */
    private String normalizarEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Objetivo vazio vira {@code null}: o campo e opcional e gravar string em
     * branco criaria dois estados diferentes para "nao preenchido".
     */
    private String normalizarObjetivo(String objetivo) {
        if (objetivo == null) {
            return null;
        }
        String trimmed = objetivo.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Usuario usuarioDaSessao() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();

        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            throw new SessaoInvalidaException();
        }

        return usuarios.findById(sessao.id())
                .orElseThrow(SessaoInvalidaException::new);
    }
}
