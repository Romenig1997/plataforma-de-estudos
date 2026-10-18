package br.com.romenig.plataforma.autenticacao;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.VinculoDeUsuarioService;
import io.jsonwebtoken.JwtException;

/**
 * Le o cabecalho {@code Authorization: Bearer <access token do Supabase>} e,
 * se o token for valido, publica a sessao no {@code SecurityContext}.
 *
 * <p>Token ausente ou invalido nao bloqueia a requisicao aqui: ela segue sem
 * autenticacao e o {@code SecurityFilterChain} responde 401 quando o recurso e
 * protegido.
 *
 * <p>O papel (ADMIN/ALUNO) e lido do banco a cada requisicao, e nao do token:
 * uma alteracao feita pela area admin vale imediatamente. O principal
 * continua sendo {@link SessaoAutenticada} com o id interno do usuario, entao
 * os servicos existentes nao mudam. O token original fica nas credenciais,
 * para que o envio da foto ao Storage use a identidade da propria pessoa.
 */
@Component
public class FiltroDeTokenSupabase extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final VerificadorDeTokenSupabase verificador;
    private final VinculoDeUsuarioService vinculos;

    public FiltroDeTokenSupabase(VerificadorDeTokenSupabase verificador, VinculoDeUsuarioService vinculos) {
        this.verificador = verificador;
        this.vinculos = vinculos;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest requisicao, HttpServletResponse resposta, FilterChain cadeia)
            throws ServletException, IOException {

        String cabecalho = requisicao.getHeader(HttpHeaders.AUTHORIZATION);
        if (cabecalho == null || !cabecalho.startsWith(PREFIXO)) {
            cadeia.doFilter(requisicao, resposta);
            return;
        }

        String token = cabecalho.substring(PREFIXO.length()).trim();
        try {
            IdentidadeSupabase identidade = verificador.verificar(token);
            Usuario usuario = perfilDe(identidade);

            UsernamePasswordAuthenticationToken autenticacao = UsernamePasswordAuthenticationToken.authenticated(
                    new SessaoAutenticada(usuario.getId()), token,
                    List.of(new SimpleGrantedAuthority(usuario.getPerfil())));
            autenticacao.setDetails(new WebAuthenticationDetailsSource().buildDetails(requisicao));
            SecurityContextHolder.getContext().setAuthentication(autenticacao);
        } catch (JwtException | IllegalArgumentException | SessaoInvalidaException e) {
            SecurityContextHolder.clearContext();
        }

        cadeia.doFilter(requisicao, resposta);
    }

    /** Duas requisicoes simultaneas do primeiro acesso: a segunda le o perfil criado pela primeira. */
    private Usuario perfilDe(IdentidadeSupabase identidade) {
        try {
            return vinculos.perfilDe(identidade);
        } catch (DataIntegrityViolationException corrida) {
            return vinculos.perfilDe(identidade);
        }
    }
}
