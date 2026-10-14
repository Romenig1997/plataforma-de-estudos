package br.com.romenig.plataforma.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Permite que o frontend em desenvolvimento (Vite, porta 5173) chame a API.
 *
 * A origem e fixa de proposito: e o endereco do dev server, nao o deploying de
 * producao.
 *
 * <p>Atualizado na HU02: entrou {@code GET} (recurso protegido da sessao) e o
 * cabecalho {@code Authorization}, que carrega o token. Atualizado na HU03:
 * entrou {@code PUT} ({@code /api/perfil}). Esta lista segue sendo o minimo:
 * nenhuma origem, metodo ou cabecalho alem desses e liberado.
 *
 * <p>No dev o Vite faz proxy de {@code /api} para {@code localhost:8080}
 * ({@code frontend/vite.config.ts}), entao o navegador fala com a mesma origem
 * e o CORS nem e acionado. A configuracao vale para quem rodar o frontend
 * apontando direto para a API.
 */
@Configuration
public class ConfiguracaoWeb implements WebMvcConfigurer {

    private final String[] origens;

    public ConfiguracaoWeb(@Value("${plataforma.cors.origens:http://localhost:5173}") String origens) {
        this.origens = java.util.Arrays.stream(origens.split(","))
                .map(String::trim).filter(valor -> !valor.isBlank()).toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origens)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Authorization");
    }
}
