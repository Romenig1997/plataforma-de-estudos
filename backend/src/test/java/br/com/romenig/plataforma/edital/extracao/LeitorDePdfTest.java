package br.com.romenig.plataforma.edital.extracao;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import br.com.romenig.plataforma.edital.exception.PdfInvalidoException;

/**
 * LeitorDePdf (HU07, incremento A): o texto sai pagina a pagina, e cada indice
 * da lista corresponde ao numero da pagina (indice 0 = pagina 1).
 */
class LeitorDePdfTest {

    private final LeitorDePdf leitor = new LeitorDePdf();

    @Test
    void extraiOTextoDeCadaPaginaNaOrdem() throws IOException {
        List<String> paginas = leitor.extrairTextoPorPagina(gerarPdfComDuasPaginas());

        assertEquals(2, paginas.size());
        assertTrue(paginas.get(0).contains("CONTEUDO DA PRIMEIRA PAGINA"));
        assertTrue(paginas.get(1).contains("CONTEUDO DA SEGUNDA PAGINA"));
    }

    @Test
    void rejeitaArquivoQueNaoAbreComoPdf() {
        byte[] naoEhPdf = "isto nao e um documento pdf".getBytes(StandardCharsets.UTF_8);

        assertThrows(PdfInvalidoException.class, () -> leitor.extrairTextoPorPagina(naoEhPdf));
    }

    /** Gera o PDF em memoria: nao commita binario e controla o conteudo por pagina. */
    private byte[] gerarPdfComDuasPaginas() throws IOException {
        try (PDDocument documento = new PDDocument()) {
            adicionarPagina(documento, "CONTEUDO DA PRIMEIRA PAGINA");
            adicionarPagina(documento, "CONTEUDO DA SEGUNDA PAGINA");

            ByteArrayOutputStream saida = new ByteArrayOutputStream();
            documento.save(saida);
            return saida.toByteArray();
        }
    }

    private void adicionarPagina(PDDocument documento, String texto) throws IOException {
        PDPage pagina = new PDPage();
        documento.addPage(pagina);

        try (PDPageContentStream fluxo = new PDPageContentStream(documento, pagina)) {
            fluxo.beginText();
            fluxo.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
            fluxo.newLineAtOffset(60, 700);
            fluxo.showText(texto);
            fluxo.endText();
        }
    }
}