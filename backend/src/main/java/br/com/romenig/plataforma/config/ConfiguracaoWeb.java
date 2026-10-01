package br.com.romenig.plataforma.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Permite que o frontend em desenvolvimento (Vite, porta 5173) chame a API.
 *
 * A origem e fixa de proposito: e o endereco do dev server, nao o deploying de
 * producao.
 *
 * <p>Atualizado na HU02: entrou {@code GET} (recurso protegido da sessao) e o
 * cabecalho {@code Authorization}, que carrega o token. Os dois sao o minimo
 * que o fluxo de autenticacao usa — nenhuma origem, metodo ou cabecalho alem
 * desses e liberado.
 *
 * <p>No dev o Vite faz proxy de {@code /api} para {@code localhost:8080}
 * ({@code frontend/vite.config.ts}), entao o navegador fala com a mesma origem
 * e o CORS nem e acionado. A configuracao vale para quem rodar o frontend
 * apontando direto para a API.
 */
@Configuration
public class ConfiguracaoWeb implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization");
    }
}