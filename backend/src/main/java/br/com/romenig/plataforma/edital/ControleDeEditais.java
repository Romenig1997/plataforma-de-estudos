package br.com.romenig.plataforma.edital;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.WebRequest;

import br.com.romenig.plataforma.edital.dto.AcessoAoPdfResponse;
import br.com.romenig.plataforma.edital.dto.EditalResponse;

/**
 * Editais aprovados para qualquer usuario autenticado (HU07, criterio 3).
 *
 * <p>E a leitura que a tela do planner consome: o aluno escolhe um edital e o
 * sistema monta o plano a partir de suas disciplinas e conteudos. A rota vive
 * fora de {@code /api/admin/**} de proposito: ALUNO e ADMIN podem ler, mas
 * nao é por aqui que se importa ou aprova edital.
 */
@RestController
@RequestMapping("/api/editais")
public class ControleDeEditais {

    /**
     * PDF original: 30 dias so no cache do navegador de quem baixou
     * ({@code private}); nunca em cache compartilhado (proxy ou CDN), porque a
     * rota exige autenticacao. O conteudo de um id nao muda (o PDF e fixado na
     * importacao), entao o cache longo nao serve versao velha.
     */
    static final CacheControl CACHE_DO_PDF = CacheControl.maxAge(Duration.ofDays(30)).cachePrivate();

    private final ImportacaoDeEditalService servico;
    private final CapaDoCursoService capas;

    public ControleDeEditais(ImportacaoDeEditalService servico, CapaDoCursoService capas) {
        this.servico = servico;
        this.capas = capas;
    }

    /**
     * Banner do card do curso. Publico (liberado na seguranca): e so a imagem de
     * capa, sem dado pessoal. A URL do card leva a versao (?v=), entao o cache
     * pode ser longo e uma troca de banner gera outra URL.
     */
    @GetMapping("/{id}/banner")
    public ResponseEntity<byte[]> banner(@PathVariable Long id) {
        return capas.buscarBanner(id)
                .map(banner -> ResponseEntity.ok()
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic())
                        .contentType(MediaType.IMAGE_JPEG)
                        .contentLength(banner.getImagem().length)
                        .body(banner.getImagem()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<EditalResponse> listarAprovados() {
        return servico.listarAprovados();
    }

    /**
     * Como o leitor do curso deve abrir o PDF. PDFs no Storage voltam com uma
     * URL assinada de curta duracao, aberta direto no iframe sem passar pelo
     * backend; PDFs legados (bytea) voltam como {@code LEGADO} e o frontend usa
     * {@link #baixarPdfOriginal}. A resposta carrega uma credencial temporaria,
     * por isso nao vai para cache algum.
     */
    @GetMapping("/{id}/pdf/acesso")
    public ResponseEntity<AcessoAoPdfResponse> acessarPdfOriginal(@PathVariable Long id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(servico.acessarPdfDoEdital(id));
    }

    /**
     * Fallback temporario do leitor para PDFs legados (bytea), com o token da
     * sessao. Cache privado de 30 dias e ETag pelo SHA-256: uma revalidacao
     * responde 304 sem ler o arquivo do banco.
     */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> baixarPdfOriginal(@PathVariable Long id, WebRequest requisicao) {
        EditalPdf pdf = servico.baixarPdfDoEdital(id);
        String etag = "\"" + pdf.getSha256() + "\"";
        if (requisicao.checkNotModified(etag)) {
            return ResponseEntity.status(HttpStatus.NOT_MODIFIED)
                    .cacheControl(CACHE_DO_PDF)
                    .eTag(etag)
                    .build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(pdf.getNomeOriginal(), StandardCharsets.UTF_8).build().toString())
                .cacheControl(CACHE_DO_PDF)
                .eTag(etag)
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.getTamanhoBytes())
                .body(servico.lerPdf(pdf));
    }
}
