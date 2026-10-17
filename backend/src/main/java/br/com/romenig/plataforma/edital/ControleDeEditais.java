package br.com.romenig.plataforma.edital;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    /** O leitor do curso busca o PDF com o token da sessão e abre a página do tópico. */
    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> baixarPdfOriginal(@PathVariable Long id) {
        EditalPdf pdf = servico.baixarPdfDoEdital(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(pdf.getNomeOriginal(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.getTamanhoBytes())
                .body(pdf.getBytes());
    }
}
