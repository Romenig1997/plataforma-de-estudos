package br.com.romenig.plataforma.autenticacao;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.dto.AlterarSenhaRequest;
import br.com.romenig.plataforma.autenticacao.dto.LoginResponse;
import br.com.romenig.plataforma.autenticacao.dto.RedefinirSenhaRequest;
import br.com.romenig.plataforma.autenticacao.exception.CredenciaisInvalidasException;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.usuario.CodificadorDeSenha;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/** Confirmacao de e-mail, redefinicao de senha e invalidacao de sessoes. */
@Service
public class SegurancaDaContaService {
    private static final SecureRandom ALEATORIO = new SecureRandom();

    private final UsuarioRepository usuarios;
    private final TokenContaRepository tokensDeConta;
    private final CodificadorDeSenha senhas;
    private final TokenJwtService tokensJwt;
    private final NotificadorEmail email;
    private final String urlFrontend;
    private final boolean exigirConfirmacao;

    public SegurancaDaContaService(UsuarioRepository usuarios, TokenContaRepository tokensDeConta,
                                   CodificadorDeSenha senhas, TokenJwtService tokensJwt,
                                   NotificadorEmail email,
                                   @Value("${plataforma.frontend-url:http://localhost:5173}") String urlFrontend,
                                   @Value("${plataforma.email.exigir-confirmacao:true}") boolean exigirConfirmacao) {
        this.usuarios = usuarios;
        this.tokensDeConta = tokensDeConta;
        this.senhas = senhas;
        this.tokensJwt = tokensJwt;
        this.email = email;
        this.urlFrontend = urlFrontend.replaceAll("/+$", "");
        this.exigirConfirmacao = exigirConfirmacao;
    }

    @Transactional
    public void enviarConfirmacaoParaNovoCadastro(Usuario usuario) {
        if (exigirConfirmacao) enviarConfirmacao(usuario);
    }

    @Transactional
    public void reenviarConfirmacao(String emailNormalizado) {
        usuarios.findByEmail(emailNormalizado).filter(usuario -> !usuario.isEmailVerificado())
                .ifPresent(this::enviarConfirmacao);
    }

    @Transactional
    public void confirmarEmail(String token) {
        TokenConta tokenConta = buscarValido(token, TipoTokenConta.CONFIRMACAO_EMAIL);
        tokenConta.getUsuario().confirmarEmail();
        tokenConta.getUsuario().invalidarSessoes();
        tokenConta.consumir();
    }

    @Transactional
    public void solicitarRedefinicao(String emailNormalizado) {
        usuarios.findByEmail(emailNormalizado).ifPresent(usuario -> {
            String token = novoToken(usuario, TipoTokenConta.REDEFINICAO_SENHA, Duration.ofMinutes(30));
            email.enviarRedefinicaoDeSenha(usuario.getEmail(),
                    urlFrontend + "/redefinir-senha?token=" + token);
        });
    }

    @Transactional
    public void redefinirSenha(RedefinirSenhaRequest request) {
        TokenConta tokenConta = buscarValido(request.token(), TipoTokenConta.REDEFINICAO_SENHA);
        Usuario usuario = tokenConta.getUsuario();
        usuario.definirSenha(senhas.codificar(request.novaSenha()));
        usuario.confirmarEmail();
        tokenConta.consumir();
    }

    @Transactional
    public LoginResponse alterarSenha(AlterarSenhaRequest request) {
        Usuario usuario = usuarioDaSessao();
        if (!senhas.conferir(request.senhaAtual(), usuario.getSenhaHash())) {
            throw new CredenciaisInvalidasException();
        }
        usuario.definirSenha(senhas.codificar(request.novaSenha()));
        return respostaDeLogin(usuario);
    }

    @Transactional
    public void encerrarTodasAsSessoes() {
        usuarioDaSessao().invalidarSessoes();
    }

    private void enviarConfirmacao(Usuario usuario) {
        String token = novoToken(usuario, TipoTokenConta.CONFIRMACAO_EMAIL, Duration.ofHours(24));
        email.enviarConfirmacao(usuario.getEmail(), urlFrontend + "/confirmar-email?token=" + token);
    }

    private String novoToken(Usuario usuario, TipoTokenConta tipo, Duration validade) {
        tokensDeConta.findByUsuario_IdAndTipoAndUsadoEmIsNull(usuario.getId(), tipo).forEach(TokenConta::consumir);
        byte[] bytes = new byte[32];
        ALEATORIO.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokensDeConta.save(new TokenConta(usuario, tipo, hash(token), Instant.now().plus(validade)));
        return token;
    }

    private TokenConta buscarValido(String token, TipoTokenConta tipo) {
        return tokensDeConta.findByHashTokenAndTipo(hash(token), tipo)
                .filter(encontrado -> encontrado.estaValido(Instant.now()))
                .orElseThrow(TokenContaInvalidoException::new);
    }

    private String hash(String valor) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível nesta JVM.", e);
        }
    }

    private Usuario usuarioDaSessao() {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            throw new SessaoInvalidaException();
        }
        return usuarios.findById(sessao.id()).orElseThrow(SessaoInvalidaException::new);
    }

    private LoginResponse respostaDeLogin(Usuario usuario) {
        return new LoginResponse(tokensJwt.gerar(usuario.getId(), usuario.getPerfil(), usuario.getSessaoVersao()),
                LoginResponse.TIPO_BEARER, tokensJwt.validadeEmMinutos(), usuario.getId(), usuario.getNome(),
                usuario.getEmail(), usuario.getPerfil());
    }

    public static String normalizarEmail(String email) { return email.trim().toLowerCase(Locale.ROOT); }
}
