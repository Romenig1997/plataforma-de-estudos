package br.com.romenig.plataforma.autenticacao;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import br.com.romenig.plataforma.usuario.UsuarioRepository;
import io.jsonwebtoken.JwtException;

/**
 * Le o cabecalho {@code Authorization: Bearer <token>} e, se o token for
 * valido, publica a identidade no {@code SecurityContext}.
 *
 * <p>Se o token estiver ausente, malformado ou expirado, o filtro NAO bloqueia
 * a requisicao: apenas segue sem autenticacao. Quem decide se a requisicao pode
 * passar e o {@code SecurityFilterChain}; quando o recurso exige autenticacao,
 * o ponto de entrada padrao do Spring Security devolve 401. Isso mantem o
 * login e o cadastro - que sao publicos - funcionando normalmente mesmo com um
 * token velho presente.
 *
 * <p>Nao ha consulta ao banco aqui: toda a informacao necessaria esta no
 * token. A conta e lida do banco apenas no login e em {@code /api/auth/me}.
 *
 * <p>Desde a HU04 o token carrega o perfil de acesso, e o filtro publica a
 * authority correspondente (o proprio nome do perfil). Tokens emitidos antes
 * da HU04 nao tem o claim e sao tratados como {@code ALUNO} - menor
 * privilegio -, para que sessoes ativas nao caiam ao primeiro acesso.
 */
@Component
public class FiltroDeTokenJwt extends OncePerRequestFilter {

    private static final String PREFIXO = "Bearer ";

    private final TokenJwtService tokens;
    private final UsuarioRepository usuarios;

    public FiltroDeTokenJwt(TokenJwtService tokens, UsuarioRepository usuarios) {
        this.tokens = tokens;
        this.usuarios = usuarios;
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
            Long idUsuario = tokens.extrairUsuarioId(token);
            int versaoDaSessao = tokens.extrairVersaoDaSessao(token);
            var usuario = usuarios.findById(idUsuario).orElse(null);
            if (usuario == null || usuario.getSessaoVersao() != versaoDaSessao) {
                SecurityContextHolder.clearContext();
                cadeia.doFilter(requisicao, resposta);
                return;
            }

            // HU04: a authority vem do claim "perfil". Sem o claim (token
            // antigo) o acesso vale como ALUNO ate o proximo login.
            String perfil = tokens.extrairPerfil(token);
            String authority = perfil != null ? perfil : "ALUNO";

            UsernamePasswordAuthenticationToken autenticacao = UsernamePasswordAuthenticationToken
                    .authenticated(new SessaoAutenticada(idUsuario), null,
                            List.of(new SimpleGrantedAuthority(authority)));
            autenticacao.setDetails(new WebAuthenticationDetailsSource().buildDetails(requisicao));

            SecurityContextHolder.getContext().setAuthentication(autenticacao);
        } catch (JwtException | IllegalArgumentException e) {
            // Token invalido ou expirado: a requisicao segue sem autenticacao
            // e, se o recurso for protegido, o entry point responde 401.
            SecurityContextHolder.clearContext();
        }

        cadeia.doFilter(requisicao, resposta);
    }
}
