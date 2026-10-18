package br.com.romenig.plataforma.edital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.ContasDeTeste;
import br.com.romenig.plataforma.edital.armazenamento.ArmazenamentoDePdfsEmMemoria;

import tools.jackson.databind.ObjectMapper;

/**
 * Egress dos PDFs de edital: arquivos novos no Storage (so metadados no
 * banco), URL assinada para o leitor, fallback com cache privado para os PDFs
 * legados em bytea e a copia dos legados para o Storage.
 *
 * <p>O Storage e o {@link ArmazenamentoDePdfsEmMemoria}; nenhum servico real
 * e contatado.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PdfDoEditalTest {

    private static final String CACHE_PRIVADO_30_DIAS = "max-age=2592000, private";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ObjectMapper json;

    @Autowired
    private ArmazenamentoDePdfsEmMemoria storage;

    @Test
    void pdfNovoVaiParaOStorageEOBancoGuardaSoMetadados() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.storage@email.com");
        byte[] pdf = gerarPdf("EDITAL NOVO");

        Map<String, Object> importacao = importar(admin, pdf);

        String sha256 = ArquivosDePdf.sha256(pdf);
        Map<String, Object> linha = jdbc.queryForMap(
                "SELECT caminho_storage, bytes, tamanho_bytes, tipo, nome_original FROM edital_pdf WHERE sha256 = ?", sha256);
        assertThat(linha.get("caminho_storage")).isEqualTo("editais/" + sha256 + ".pdf");
        assertThat(linha.get("bytes")).isNull();
        assertThat(((Number) linha.get("tamanho_bytes")).longValue()).isEqualTo(pdf.length);
        assertThat(linha.get("tipo")).isEqualTo("application/pdf");
        assertThat(linha.get("nome_original")).isEqualTo("edital.pdf");
        assertThat(storage.arquivo("editais/" + sha256 + ".pdf")).isEqualTo(pdf);
        assertThat(importacao.get("sha256")).isEqualTo(sha256);
    }

    @Test
    void alunoRecebeUrlAssinadaDoStorageSemCache() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.assina@email.com");
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.assina@email.com");
        byte[] pdf = gerarPdf("EDITAL ASSINADO");
        long editalId = criarCursoComPdfNoStorage(admin, pdf, "Curso com PDF no Storage");

        mockMvc.perform(get("/api/editais/{id}/pdf/acesso", editalId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.origem").value("STORAGE"))
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.startsWith(
                        ArmazenamentoDePdfsEmMemoria.PREFIXO_ASSINADO + "editais/" + ArquivosDePdf.sha256(pdf) + ".pdf?token=")))
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.containsString("expiresIn=3600")))
                .andExpect(jsonPath("$.expiraEm").isNotEmpty());
    }

    @Test
    void acessoAoPdfExigeAutenticacao() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.anonimo@email.com");
        long editalId = criarCursoComPdfNoStorage(admin, gerarPdf("EDITAL ANONIMO"), "Curso protegido");

        mockMvc.perform(get("/api/editais/{id}/pdf/acesso", editalId)).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/editais/{id}/pdf", editalId)).andExpect(status().isUnauthorized());
    }

    @Test
    void pdfLegadoUsaOEndpointAntigoComCachePrivadoDe30Dias() throws Exception {
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.legado@email.com");
        byte[] pdf = gerarPdf("EDITAL LEGADO");
        long editalId = criarCursoComPdfLegado(pdf, "Curso legado");

        mockMvc.perform(get("/api/editais/{id}/pdf/acesso", editalId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.origem").value("LEGADO"))
                .andExpect(jsonPath("$.url").value(org.hamcrest.Matchers.nullValue()));

        String etag = "\"" + ArquivosDePdf.sha256(pdf) + "\"";
        mockMvc.perform(get("/api/editais/{id}/pdf", editalId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, CACHE_PRIVADO_30_DIAS))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("public"))))
                .andExpect(header().string(HttpHeaders.ETAG, etag))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andExpect(content().bytes(pdf));

        // Revalidacao depois dos 30 dias: 304 sem corpo, o bytea nao sai do banco.
        mockMvc.perform(get("/api/editais/{id}/pdf", editalId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno)
                        .header(HttpHeaders.IF_NONE_MATCH, etag))
                .andExpect(status().isNotModified())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, CACHE_PRIVADO_30_DIAS))
                .andExpect(content().bytes(new byte[0]));
    }

    @Test
    void endpointAntigoTambemEntregaPdfDoStorageComCachePrivado() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.antigo@email.com");
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.antigo@email.com");
        byte[] pdf = gerarPdf("EDITAL COMPATIVEL");
        long editalId = criarCursoComPdfNoStorage(admin, pdf, "Curso compativel");

        mockMvc.perform(get("/api/editais/{id}/pdf", editalId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, CACHE_PRIVADO_30_DIAS))
                .andExpect(content().bytes(pdf));
    }

    @Test
    void listarCursosNaoDependeDoConteudoDoPdf() throws Exception {
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.lista@email.com");
        criarCursoComPdfLegado(gerarPdf("EDITAL LISTADO"), "Curso listado");

        mockMvc.perform(get("/api/editais").header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.titulo == 'Curso listado')].possuiPdfOriginal").value(true));
    }

    @Test
    void migracaoCopiaOLegadoParaOStorageSemApagarOBytea() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.migra@email.com");
        String aluno = ContasDeTeste.aluno(jdbc, "aluno.migra@email.com");
        byte[] pdf = gerarPdf("EDITAL A MIGRAR");
        long editalId = criarCursoComPdfLegado(pdf, "Curso a migrar");
        String sha256 = ArquivosDePdf.sha256(pdf);

        mockMvc.perform(post("/api/admin/editais/pdfs/migrar-para-storage")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/editais/pdfs/migrar-para-storage")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.migrados").value(1))
                .andExpect(jsonPath("$.falhas").isEmpty())
                .andExpect(jsonPath("$.restantes").value(0));

        Map<String, Object> linha = jdbc.queryForMap("SELECT caminho_storage, bytes FROM edital_pdf WHERE sha256 = ?", sha256);
        assertThat(linha.get("caminho_storage")).isEqualTo("editais/" + sha256 + ".pdf");
        assertThat((byte[]) linha.get("bytes")).isEqualTo(pdf);
        assertThat(storage.arquivo("editais/" + sha256 + ".pdf")).isEqualTo(pdf);

        mockMvc.perform(get("/api/editais/{id}/pdf/acesso", editalId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + aluno))
                .andExpect(jsonPath("$.origem").value("STORAGE"));
    }

    @Test
    void migracaoRecusaLegadoComConteudoDivergenteDoSha() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.divergente@email.com");
        jdbc.update("INSERT INTO edital_pdf (nome_original, tamanho_bytes, tipo, sha256, bytes, criado_em) "
                + "VALUES ('corrompido.pdf', 4, 'application/pdf', ?, ?, CURRENT_TIMESTAMP)",
                "0".repeat(64), new byte[] { 1, 2, 3, 4 });
        Long id = jdbc.queryForObject("SELECT id FROM edital_pdf WHERE nome_original = 'corrompido.pdf'", Long.class);

        mockMvc.perform(post("/api/admin/editais/pdfs/migrar-para-storage")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.migrados").value(0))
                .andExpect(jsonPath("$.falhas[0]").value(id))
                .andExpect(jsonPath("$.restantes").value(1));

        assertThat(jdbc.queryForObject("SELECT caminho_storage FROM edital_pdf WHERE id = ?", String.class, id)).isNull();
    }

    @Test
    void excluirCursoSoApagaOArquivoDoStorageDepoisDoCommit() throws Exception {
        String admin = ContasDeTeste.admin(jdbc, "admin.exclui@email.com");
        byte[] pdf = gerarPdf("EDITAL EXCLUIDO");
        long editalId = criarCursoComPdfNoStorage(admin, pdf, "Curso excluido");
        String caminho = "editais/" + ArquivosDePdf.sha256(pdf) + ".pdf";

        mockMvc.perform(delete("/api/admin/editais/{id}", editalId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().is2xxSuccessful());

        // A exclusao ainda nao foi confirmada: o arquivo continua no Storage.
        assertThat(storage.existe(caminho)).isTrue();
        TestTransaction.end();
        // Transacao desfeita: linha e arquivo seguem consistentes.
        assertThat(storage.existe(caminho)).isTrue();
        storage.remover(caminho, null);
    }

    // -----------------------------------------------------------------------
    // Auxiliares
    // -----------------------------------------------------------------------

    private long criarCursoComPdfNoStorage(String admin, byte[] pdf, String titulo) throws Exception {
        long importacaoId = ((Number) importar(admin, pdf).get("id")).longValue();
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/admin/editais/importacoes/{id}/conteudo", importacaoId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(new br.com.romenig.plataforma.edital.extracao.EditalExtraido(
                                titulo, "Orgao", 2026, java.util.List.of(), java.util.List.of(
                                new br.com.romenig.plataforma.edital.extracao.EditalExtraido.DisciplinaExtraido("Disciplina", 1,
                                        java.util.List.of(new br.com.romenig.plataforma.edital.extracao.EditalExtraido.AssuntoExtraido(
                                                "Assunto", 1, java.util.List.of()))))))))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar", importacaoId)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + admin))
                .andExpect(status().isOk());
        return jdbc.queryForObject("SELECT id FROM edital WHERE titulo = ?", Long.class, titulo);
    }

    /** PDF gravado do jeito antigo (bytea, sem caminho no Storage), como em producao antes da V19. */
    private long criarCursoComPdfLegado(byte[] pdf, String titulo) {
        jdbc.update("INSERT INTO edital_pdf (nome_original, tamanho_bytes, tipo, sha256, bytes, criado_em) "
                + "VALUES (?, ?, 'application/pdf', ?, ?, CURRENT_TIMESTAMP)",
                "legado.pdf", pdf.length, ArquivosDePdf.sha256(pdf), pdf);
        Long pdfId = jdbc.queryForObject("SELECT id FROM edital_pdf WHERE sha256 = ?", Long.class, ArquivosDePdf.sha256(pdf));
        jdbc.update("INSERT INTO edital (titulo, orgao, ano, edital_pdf_id, criado_em) VALUES (?, 'Orgao', 2026, ?, CURRENT_TIMESTAMP)",
                titulo, pdfId);
        return jdbc.queryForObject("SELECT id FROM edital WHERE titulo = ?", Long.class, titulo);
    }

    private Map<String, Object> importar(String token, byte[] pdf) throws Exception {
        MvcResult resultado = mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(new MockMultipartFile("arquivo", "edital.pdf", MediaType.APPLICATION_PDF_VALUE, pdf))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();
        return json.readValue(resultado.getResponse().getContentAsString(), Map.class);
    }

    private byte[] gerarPdf(String texto) throws IOException {
        try (PDDocument documento = new PDDocument()) {
            PDPage pagina = new PDPage();
            documento.addPage(pagina);
            try (PDPageContentStream fluxo = new PDPageContentStream(documento, pagina)) {
                fluxo.beginText();
                fluxo.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                fluxo.newLineAtOffset(60, 700);
                fluxo.showText(texto);
                fluxo.endText();
            }
            ByteArrayOutputStream saida = new ByteArrayOutputStream();
            documento.save(saida);
            return saida.toByteArray();
        }
    }
}
