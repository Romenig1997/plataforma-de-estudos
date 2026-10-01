package br.com.romenig.plataforma.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Permite que o frontend em desenvolvimento (Vite, porta 5173) chame a API.
 *
 * Ainda nao existe autenticacao, entao o CORS se limita ao metodo e ao
 * cabecalho que a tela de cadastro usa. A origem e fixa de proposito: e o
 * endereco do dev server, nao o deploying de producao.
 */
@Configuration
public class ConfiguracaoWeb implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("Content-Type");
    }
}