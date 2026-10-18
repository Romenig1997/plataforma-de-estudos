package br.com.romenig.plataforma.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderNotFoundException;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import br.com.romenig.plataforma.autenticacao.ErroDeAutenticacaoHandler;
import br.com.romenig.plataforma.autenticacao.FiltroDeTokenSupabase;

/**
 * Protecao das rotas da API.
 *
 * <p>A identidade vem do Supabase Auth: o frontend faz cadastro, login e
 * logout no Supabase e envia o access token em {@code Authorization: Bearer}.
 * O {@link FiltroDeTokenSupabase} confere o token e publica a sessao. A API
 * e <strong>sem estado</strong>: nao ha HttpSession.
 *
 * <ul>
 *   <li><b>CSRF desligado.</b> Nao ha cookie de sessao: a credencial vai num
 *       cabecalho que o navegador so envia quando a propria pagina o pede.</li>
 *   <li><b>Negado por padrao.</b> {@code anyRequest().authenticated()} faz
 *       qualquer endpoint novo nascer protegido.</li>
 *   <li><b>Regra por perfil (HU04).</b> {@code /api/admin/**} exige a
 *       authority {@code ADMIN}, lida do banco a cada requisicao. ALUNO recebe
 *       403 do {@link ErroDeAutenticacaoHandler}.</li>
 *   <li><b>{@code /error} liberado.</b> O despacho de erro do Spring precisa
 *       passar, senao uma requisicao quebrada vira 401.</li>
 * </ul>
 */
@Configuration
public class ConfiguracaoDeSeguranca {

    @Bean
    public SecurityFilterChain cadeiaDeSeguranca(HttpSecurity http,
                                                 FiltroDeTokenSupabase filtroDeToken,
                                                 ErroDeAutenticacaoHandler erros) throws Exception {

        return http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sessao -> sessao.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(rotas -> rotas
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
     * A aplicacao nao confere senhas: isso e do Supabase Auth. Declarar este
     * gerenciador que recusa tudo impede o Spring Boot de criar o usuario
     * padrao em memoria (com senha impressa no log).
     */
    @Bean
    public AuthenticationManager semAutenticacaoPorSenha() {
        return autenticacao -> {
            throw new ProviderNotFoundException("Autenticacao por senha e feita pelo Supabase Auth.");
        };
    }
}
