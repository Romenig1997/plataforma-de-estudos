package br.com.romenig.plataforma.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import br.com.romenig.plataforma.autenticacao.CodificadorDeSenhaSpring;
import br.com.romenig.plataforma.autenticacao.DetalheDeUsuarioService;
import br.com.romenig.plataforma.autenticacao.ErroDeAutenticacaoHandler;
import br.com.romenig.plataforma.autenticacao.FiltroDeTokenJwt;

/**
 * Autenticacao e protecao das rotas da HU02.
 *
 * <p>A API e <strong>sem estado</strong>: nao ha HttpSession, e o token viaja no
 * cabecalho {@code Authorization} de cada requisicao. Nada do lado do servidor
 * guarda a sessao, o que e o que permite escalar o backend sem trocar de
 * arquitetura.
 *
 * <p>Decisoes e seus porquês:
 *
 * <ul>
 *   <li><b>CSRF desligado.</b> O CSRF existe para impedir que um site terceiro
 *       faca o navegador mandar uma requisição com o cookie da sessão da
 *       vítima. Aqui não há cookie de sessão: a credencial fica num header que o
 *       navegador só envia quando a própria página o pede. Sem cookie, não há o
 *       que um site terceiro reaproveitar.</li>
 *   <li><b>Negado por padrão.</b> {@code anyRequest().authenticated()} faz
 *       qualquer endpoint novo nascer protegido. Só cadastro e login são
 *       públicos — o mínimo que a HU02 exige.</li>
 *   <li><b>Regra por perfil (HU04).</b> A área administrativa
 *       ({@code /api/admin/**}) exige a authority {@code ADMIN}, publicada
 *       pelo {@link FiltroDeTokenJwt} a partir do claim do token. ALUNO que
 *       tenta entrar recebe 403 do {@link ErroDeAutenticacaoHandler}, com o
 *       campo {@code autorizacao}. Desde a HU07 o matcher nao lista metodo:
 *       GET, POST, PUT e DELETE da area admin passam a exigir ADMIN, senao o
 *       upload e a revisao de editais nasceriam abertos a ALUNO.</li>
 *   <li><b>{@code /error} liberado.</b> O despacho de erro do próprio Spring
 *       precisa passar, senão uma requisição quebrada vira 401 em vez do erro
 *       que ela tentou descrever.</li>
 * </ul>
 */
@Configuration
public class ConfiguracaoDeSeguranca {

    @Bean
    public SecurityFilterChain cadeiaDeSeguranca(HttpSecurity http,
                                                 FiltroDeTokenJwt filtroDeToken,
                                                 ErroDeAutenticacaoHandler erros) throws Exception {

        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(rotas -> rotas
                        .requestMatchers(HttpMethod.POST, "/api/usuarios").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/confirmar-email").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/reenvio-confirmacao").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/solicitar-redefinicao").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/redefinir-senha").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health").permitAll()
                        // Banner do card do curso: imagem publica, sem dado pessoal.
                        .requestMatchers(HttpMethod.GET, "/api/editais/*/banner").permitAll()
                        .requestMatchers("/actuator/**").hasAuthority("ADMIN")
                        .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(erros401 -> erros401
                        .authenticationEntryPoint(erros)
                        .accessDeniedHandler(erros))
                .addFilterBefore(filtroDeToken, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    /**
     * Autentica e-mail + senha contra o banco.
     *
     * <p>Declarado aqui, e nao deixado para o Spring montar sozinho, porque o
     * Spring Boot criaria um usuario padrao em memoria (impresso no log de
     * startup) quando nao existe nenhum provedor de autenticacao no contexto.
     */
    @Bean
    public AuthenticationManager gerenciadorDeAutenticacao(DetalheDeUsuarioService detalheDeUsuario,
                                                           CodificadorDeSenhaSpring codificador) {

        DaoAuthenticationProvider provedor = new DaoAuthenticationProvider(detalheDeUsuario);
        provedor.setPasswordEncoder(codificador);

        return new ProviderManager(provedor);
    }
}
