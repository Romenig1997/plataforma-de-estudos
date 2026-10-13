package br.com.romenig.plataforma.edital;

import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.romenig.plataforma.edital.dto.ImportacaoDeEditalResponse;
import br.com.romenig.plataforma.edital.extracao.EditalExtraido;

/**
 * Importacao de editais em PDF (HU07, incremento A) - area exclusiva do ADMIN
 * (regra em {@code /api/admin/**}).
 *
 * <p>Endpoints do ciclo completo de upload/revisao/aprovacao: o upload recebe o
 * PDF e devolve a importacao ja com o texto extraido e organizado pela IA (ou
 * {@code FALHA}); a lista e o detalhe alimentam a tela de revisao; o PDF
 * original pode ser baixado; uma importacao com falha pode ser reprocessada;
 * e a revisao manual do conteudo e o aprovacao/rejeicao fecham o ciclo antes
 * de qualquer edital ser persistido.
 */
@RestController
@RequestMapping("/api/admin/editais/importacoes")
public class ControleDeImportacaoDeEditais {

    private final ImportacaoDeEditalService servico;

    public ControleDeImportacaoDeEditais(ImportacaoDeEditalService servico) {
        this.servico = servico;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ImportacaoDeEditalResponse> importar(@RequestParam("arquivo") MultipartFile arquivo) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servico.importar(arquivo));
    }

    @GetMapping
    public List<ImportacaoDeEditalResponse> listar() {
        return servico.listar();
    }

    @GetMapping("/{id}")
    public ImportacaoDeEditalResponse buscar(@PathVariable Long id) {
        return servico.buscar(id);
    }

    @GetMapping("/{id}/pdf")
    public ResponseEntity<byte[]> baixarPdf(@PathVariable Long id) {
        EditalPdf pdf = servico.baixarPdf(id);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition
                        .attachment()
                        .filename(pdf.getNomeOriginal(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(pdf.getTamanhoBytes())
                .body(pdf.getBytes());
    }

    @PostMapping("/{id}/reprocessar")
    public ImportacaoDeEditalResponse reprocessar(@PathVariable Long id) {
        return servico.reprocessar(id);
    }

    @PutMapping("/{id}/conteudo")
    public ImportacaoDeEditalResponse revisarConteudo(@PathVariable Long id,
                                                      @RequestBody EditalExtraido extraido) {
        return servico.revisarConteudo(id, extraido);
    }

    @PostMapping("/{id}/aprovar")
    public ImportacaoDeEditalResponse aprovar(@PathVariable Long id) {
        return servico.aprovar(id);
    }

    @PostMapping("/{id}/rejeitar")
    public ImportacaoDeEditalResponse rejeitar(@PathVariable Long id) {
        return servico.rejeitar(id);
    }
}