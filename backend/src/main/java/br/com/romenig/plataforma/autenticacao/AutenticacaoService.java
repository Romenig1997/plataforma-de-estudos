package br.com.romenig.plataforma.autenticacao;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.dto.SessaoAtualResponse;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Sessao atual (HU02).
 *
 * <p>Cadastro, login, logout, confirmacao de e-mail e redefinicao de senha sao
 * feitos pelo Supabase Auth diretamente no frontend. O backend so confere o
 * token ({@link FiltroDeTokenSupabase}) e informa o perfil da pessoa, que e o
 * que o frontend usa para separar a area do aluno da area administrativa.
 */
@Service
public class AutenticacaoService {

    private final UsuarioRepository usuarios;

    public AutenticacaoService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public SessaoAtualResponse sessaoAtual() {
        Usuario usuario = usuarios.findById(idDaSessao()).orElseThrow(SessaoInvalidaException::new);
        return SessaoAtualResponse.de(usuario);
    }

    /** Id interno do usuario da requisicao atual. */
    public static Long idDaSessao() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            throw new SessaoInvalidaException();
        }
        return sessao.id();
    }

    /** Access token do Supabase apresentado na requisicao atual. */
    public static String tokenDaSessao() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getCredentials() instanceof String token)) {
            throw new SessaoInvalidaException();
        }
        return token;
    }
}
