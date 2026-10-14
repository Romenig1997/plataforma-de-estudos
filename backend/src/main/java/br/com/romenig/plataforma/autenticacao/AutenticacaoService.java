package br.com.romenig.plataforma.autenticacao;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import br.com.romenig.plataforma.autenticacao.dto.LoginRequest;
import br.com.romenig.plataforma.autenticacao.dto.LoginResponse;
import br.com.romenig.plataforma.autenticacao.dto.SessaoAtualResponse;
import br.com.romenig.plataforma.autenticacao.exception.CredenciaisInvalidasException;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Fluxo de autenticacao da HU02.
 *
 * <p>Confia a conferencia da senha ao Spring Security
 * ({@code DaoAuthenticationProvider} + {@link DetalheDeUsuarioService} +
 * {@link CodificadorDeSenhaSpring}), que recarrega o usuario do banco e compara
 * com o hash PBKDF2 gravado na HU01. Aqui so o que o framework nao faz: emitir
 * o token e traduzir falha em erro de negocio.
 *
 * <p>Toda falha vira {@link CredenciaisInvalidasException} com a mesma
 * mensagem - e-mail inexistente e senha errada sao indistinguiveis para quem
 * chama a API.
 */
@Service
public class AutenticacaoService {

    private final AuthenticationManager gerenciadorDeAutenticacao;
    private final TokenJwtService tokens;
    private final UsuarioRepository usuarios;
    private final boolean exigirConfirmacao;

    public AutenticacaoService(AuthenticationManager gerenciadorDeAutenticacao,
                               TokenJwtService tokens,
                               UsuarioRepository usuarios,
                               @Value("${plataforma.email.exigir-confirmacao:true}") boolean exigirConfirmacao) {
        this.gerenciadorDeAutenticacao = gerenciadorDeAutenticacao;
        this.tokens = tokens;
        this.usuarios = usuarios;
        this.exigirConfirmacao = exigirConfirmacao;
    }

    @Transactional(readOnly = true)
    public LoginResponse autenticar(LoginRequest requisicao) {
        try {
            Authentication autenticacao = gerenciadorDeAutenticacao.authenticate(
                    new UsernamePasswordAuthenticationToken(requisicao.email(), requisicao.senha()));

            UsuarioAutenticado usuario = (UsuarioAutenticado) autenticacao.getPrincipal();

            return new LoginResponse(
                    tokenDo(usuario),
                    LoginResponse.TIPO_BEARER,
                    tokens.validadeEmMinutos(),
                    usuario.getId(),
                    usuario.getNome(),
                    usuario.getEmail(),
                    usuario.getPerfil());
        } catch (AuthenticationException e) {
            // BadCredentialsException cobre e-mail inexistente e senha errada.
            throw new CredenciaisInvalidasException();
        }
    }

    private String tokenDo(UsuarioAutenticado autenticado) {
        Usuario usuario = usuarios.findById(autenticado.getId()).orElseThrow(SessaoInvalidaException::new);
        if (exigirConfirmacao && !usuario.isEmailVerificado()) {
            throw new EmailNaoConfirmadoException();
        }
        return tokens.gerar(usuario.getId(), usuario.getPerfil(), usuario.getSessaoVersao());
    }

    /**
     * Recurso protegido: so e chamado quando o {@code FiltroDeTokenJwt} ja
     * publicou uma sessao no {@code SecurityContext}.
     */
    @Transactional(readOnly = true)
    public SessaoAtualResponse sessaoAtual() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();

        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            // Defensivo: a rota exige autenticacao, entao o filtro ja teria
            // publicado a sessao - ou o entry point ja teria respondido 401
            // antes de o controller ser chamado.
            throw new SessaoInvalidaException();
        }

        Usuario usuario = usuarios.findById(sessao.id())
                .orElseThrow(SessaoInvalidaException::new);

        return new SessaoAtualResponse(
                usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPerfil());
    }
}
