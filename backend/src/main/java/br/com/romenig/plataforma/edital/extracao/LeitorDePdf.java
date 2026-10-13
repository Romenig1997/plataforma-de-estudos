package br.com.romenig.plataforma.edital.extracao;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import br.com.romenig.plataforma.edital.exception.PdfInvalidoException;

/**
 * Extrai o texto do PDF do edital uma pagina por vez (HU07, incremento A).
 *
 * <p>O indice da lista devolvida e a {@code pagina - 1} do documento: e essa
 * relacao que permite a IA marcar cada disciplina/conteudo com a pagina de
 * origem e a validacao conferir que a pagina cai dentro do intervalo real.
 */
@Component
public class LeitorDePdf {

    /**
     * @param bytes conteudo de um arquivo que ja passou no checagem de {@code %PDF}
     * @return texto de cada pagina, na ordem do documento
     * @throws PdfInvalidoException quando o PDFBox nao consegue abrir o arquivo
     */
    public List<String> extrairTextoPorPagina(byte[] bytes) {
        try (PDDocument documento = Loader.loadPDF(bytes)) {
            PDFTextStripper extraidor = new PDFTextStripper();
            List<String> paginas = new ArrayList<>();

            for (int numero = 1; numero <= documento.getNumberOfPages(); numero++) {
                extraidor.setStartPage(numero);
                extraidor.setEndPage(numero);
                paginas.add(extraidor.getText(documento));
            }

            return paginas;
        } catch (IOException excecao) {
            throw new PdfInvalidoException();
        }
    }
}