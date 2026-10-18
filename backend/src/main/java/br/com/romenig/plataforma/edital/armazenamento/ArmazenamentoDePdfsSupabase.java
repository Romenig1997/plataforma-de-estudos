package br.com.romenig.plataforma.edital.armazenamento;

import java.time.Duration;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import br.com.romenig.plataforma.edital.exception.PdfIndisponivelException;

/**
 * PDFs de edital no Supabase Storage (bucket privado {@code editais-pdf}).
 *
 * <p>Mesmo modelo das fotos de perfil: o token da propria pessoa mais a chave
 * publica do projeto ({@code apikey}). As politicas de
 * supabase/migrations/20261018000400_storage_pdfs_de_editais.sql deixam so o
 * ADMIN gravar e apagar, e qualquer conta autenticada ler apenas PDFs de
 * cursos publicados. O bucket nao e publico: a leitura pelo navegador e
 * sempre por URL assinada de curta duracao.
 *
 * <p>O caminho e o SHA-256 do conteudo, portanto nunca muda de conteudo: o
 * arquivo e enviado com {@code cache-control} de 1 ano e pode ficar no cache
 * do navegador e da CDN do Storage sem risco de servir versao velha.
 */
@Component
@ConditionalOnProperty(name = "plataforma.armazenamento.tipo", havingValue = "supabase", matchIfMissing = true)
public class ArmazenamentoDePdfsSupabase implements ArmazenamentoDePdfs {

    private static final Logger LOG = LoggerFactory.getLogger(ArmazenamentoDePdfsSupabase.class);

    private final RestClient http;
    private final String urlDoStorage;
    private final String bucket;
    private final String chavePublica;

    public ArmazenamentoDePdfsSupabase(@Value("${plataforma.supabase.url}") String urlDoProjeto,
                                       @Value("${plataforma.supabase.chave-publica:}") String chavePublica,
                                       @Value("${plataforma.supabase.bucket-pdfs:editais-pdf}") String bucket) {
        String base = urlDoProjeto.endsWith("/") ? urlDoProjeto.substring(0, urlDoProjeto.length() - 1) : urlDoProjeto;
        this.urlDoStorage = base + "/storage/v1";
        this.chavePublica = chavePublica;
        this.bucket = bucket;
        this.http = RestClient.builder().baseUrl(urlDoStorage).build();
    }

    @Override
    public void enviar(String caminho, byte[] pdf, String tokenDoUsuario) {
        try {
            http.post()
                    .uri("/object/" + bucket + "/" + caminho)
                    .headers(cabecalhos -> {
                        autenticar(cabecalhos, tokenDoUsuario);
                        // Mesmo caminho = mesmo conteudo (SHA-256): sobrescrever e inofensivo.
                        cabecalhos.set("x-upsert", "true");
                        cabecalhos.set("cache-control", "max-age=31536000");
                    })
                    .contentType(MediaType.APPLICATION_PDF)
                    .body(pdf)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new PdfIndisponivelException(e);
        }
    }

    @Override
    public byte[] baixar(String caminho, String tokenDoUsuario) {
        try {
            byte[] pdf = http.get()
                    .uri("/object/authenticated/" + bucket + "/" + caminho)
                    .headers(cabecalhos -> autenticar(cabecalhos, tokenDoUsuario))
                    .retrieve()
                    .body(byte[].class);
            if (pdf == null) {
                throw new PdfIndisponivelException(new IllegalStateException("Storage devolveu corpo vazio."));
            }
            return pdf;
        } catch (RestClientException e) {
            throw new PdfIndisponivelException(e);
        }
    }

    @Override
    public String assinar(String caminho, Duration validade, String tokenDoUsuario) {
        try {
            Map<?, ?> resposta = http.post()
                    .uri("/object/sign/" + bucket + "/" + caminho)
                    .headers(cabecalhos -> autenticar(cabecalhos, tokenDoUsuario))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("expiresIn", validade.toSeconds()))
                    .retrieve()
                    .body(Map.class);
            Object relativa = resposta == null ? null : resposta.get("signedURL");
            if (!(relativa instanceof String url) || url.isBlank()) {
                throw new PdfIndisponivelException(new IllegalStateException("Storage nao devolveu a URL assinada."));
            }
            // A API devolve o caminho relativo a /storage/v1 (/object/sign/...?token=...).
            return url.startsWith("http") ? url : urlDoStorage + (url.startsWith("/") ? url : "/" + url);
        } catch (RestClientException e) {
            throw new PdfIndisponivelException(e);
        }
    }

    @Override
    public void remover(String caminho, String tokenDoUsuario) {
        try {
            http.delete()
                    .uri("/object/" + bucket + "/" + caminho)
                    .headers(cabecalhos -> autenticar(cabecalhos, tokenDoUsuario))
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            // A linha ja saiu do banco; um arquivo orfao nao fica acessivel a alunos.
            LOG.warn("Nao foi possivel apagar o PDF {} do Storage: {}", caminho, e.getMessage());
        }
    }

    private void autenticar(HttpHeaders cabecalhos, String tokenDoUsuario) {
        cabecalhos.setBearerAuth(tokenDoUsuario);
        cabecalhos.set("apikey", chavePublica);
    }
}
