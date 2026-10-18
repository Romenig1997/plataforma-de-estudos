package br.com.romenig.plataforma.perfil.foto;

import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Fotos de perfil no Supabase Storage (bucket {@code avatars}).
 *
 * <p>O envio usa o access token da propria pessoa e a chave publica do
 * projeto ({@code apikey}). Quem decide se o arquivo pode ser gravado sao as
 * politicas do Storage (supabase/migrations): cada identidade so escreve na
 * pasta {@code {auth.uid()}/}. O backend nao precisa da chave service_role.
 *
 * <p>Cada envio cria um arquivo com nome novo, o que dispensa invalidar cache
 * de CDN; o arquivo anterior e apagado em seguida.
 */
@Component
@ConditionalOnProperty(name = "plataforma.armazenamento.tipo", havingValue = "supabase", matchIfMissing = true)
public class ArmazenamentoSupabase implements ArmazenamentoDeFotos {

    private static final Logger LOG = LoggerFactory.getLogger(ArmazenamentoSupabase.class);

    private final RestClient http;
    private final String urlDoProjeto;
    private final String bucket;
    private final String chavePublica;

    public ArmazenamentoSupabase(@Value("${plataforma.supabase.url}") String urlDoProjeto,
                                 @Value("${plataforma.supabase.chave-publica:}") String chavePublica,
                                 @Value("${plataforma.supabase.bucket-fotos:avatars}") String bucket) {
        this.urlDoProjeto = urlDoProjeto.endsWith("/") ? urlDoProjeto.substring(0, urlDoProjeto.length() - 1) : urlDoProjeto;
        this.chavePublica = chavePublica;
        this.bucket = bucket;
        this.http = RestClient.builder().baseUrl(this.urlDoProjeto + "/storage/v1").build();
    }

    @Override
    public String enviar(UUID dono, byte[] png, String tokenDoUsuario) {
        String caminho = dono + "/avatar-" + UUID.randomUUID() + ".png";
        try {
            http.post()
                    .uri("/object/" + bucket + "/" + caminho)
                    .headers(cabecalhos -> {
                        cabecalhos.setBearerAuth(tokenDoUsuario);
                        cabecalhos.set("apikey", chavePublica);
                        cabecalhos.set("x-upsert", "false");
                        cabecalhos.set("cache-control", "max-age=31536000");
                    })
                    .contentType(MediaType.IMAGE_PNG)
                    .body(png)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new ArmazenamentoIndisponivelException(e);
        }
        return prefixoPublico() + caminho;
    }

    @Override
    public void remover(String url, String tokenDoUsuario) {
        if (url == null || !url.startsWith(prefixoPublico())) {
            return;
        }
        String caminho = url.substring(prefixoPublico().length());
        try {
            http.delete()
                    .uri("/object/" + bucket + "/" + caminho)
                    .headers(cabecalhos -> {
                        cabecalhos.setBearerAuth(tokenDoUsuario);
                        cabecalhos.set("apikey", chavePublica);
                    })
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            // A foto ja saiu do perfil; um arquivo orfao nao afeta a pessoa.
            LOG.warn("Nao foi possivel apagar a foto antiga do Storage: {}", e.getMessage());
        }
    }

    private String prefixoPublico() {
        return urlDoProjeto + "/storage/v1/object/public/" + bucket + "/";
    }
}
