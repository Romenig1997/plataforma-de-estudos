package br.com.romenig.plataforma.config;

import jakarta.servlet.MultipartConfigElement;

import org.springframework.boot.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

/**
 * Define explicitamente os limites do multipart usados pelo container web.
 *
 * <p>O limite precisa estar no {@link MultipartConfigElement}, pois o Tomcat
 * rejeita o corpo da requisição antes que o controlador de importação receba
 * o PDF. Os mesmos valores também ficam documentados em application.yml.</p>
 */
@Configuration
public class ConfiguracaoDeUpload {

    private static final DataSize TAMANHO_MAXIMO_DO_ARQUIVO = DataSize.ofMegabytes(30);
    private static final DataSize TAMANHO_MAXIMO_DA_REQUISICAO = DataSize.ofMegabytes(32);

    @Bean
    MultipartConfigElement configuracaoMultipart() {
        MultipartConfigFactory fabrica = new MultipartConfigFactory();
        fabrica.setMaxFileSize(TAMANHO_MAXIMO_DO_ARQUIVO);
        fabrica.setMaxRequestSize(TAMANHO_MAXIMO_DA_REQUISICAO);
        return fabrica.createMultipartConfig();
    }
}
