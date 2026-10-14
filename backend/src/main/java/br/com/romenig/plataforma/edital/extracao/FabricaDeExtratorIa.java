package br.com.romenig.plataforma.edital.extracao;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import tools.jackson.databind.ObjectMapper;

/**
 * Escolhe a implementacao de {@link ExtratorDeEditalIA} pela propriedade
 * {@code plataforma.ia.tipo} (HU07, incremento A).
 *
 * <p>{@code rest} (padrao) usa o provedor configurado e exige url/modelo/chave
 * definidos - a aplicacao sobe mesmo sem chave, e a extracao falha com status
 * {@code FALHA} ao tentar chamar. {@code fake} existe para os testes (e apenas
 * para eles): a IA nunca e chamada na suite.
 */
@Configuration
public class FabricaDeExtratorIa {

    @Bean
    @ConditionalOnProperty(name = "plataforma.ia.tipo", havingValue = "rest", matchIfMissing = true)
    public ExtratorDeEditalIA extratorDeIaRest(
            @Value("${plataforma.ia.url}") String url,
            @Value("${plataforma.ia.modelo}") String modelo,
            @Value("${plataforma.ia.chave}") String chave,
            ObjectMapper mapper) {
        return new ExtratorDeEditalIaRest(url, modelo, chave, mapper);
    }

    @Bean
    @ConditionalOnProperty(name = "plataforma.ia.tipo", havingValue = "fake")
    public ExtratorDeEditalIA extratorDeIaFake() {
        return new ExtratorDeEditalIaFake();
    }

    @Bean
    @ConditionalOnProperty(name = "plataforma.ia.tipo", havingValue = "manual")
    public ExtratorDeEditalIA extratorManual() {
        // Sem provedor externo: o ADMIN prepara e revisa o conteudo real.
        return paginas -> new EditalExtraido("", "", null, java.util.List.of(), java.util.List.of());
    }
}
