package br.com.romenig.plataforma.edital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.ArgumentMatchers.anyList;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import br.com.romenig.plataforma.usuario.CodificadorDeSenha;
import br.com.romenig.plataforma.edital.extracao.ExtratorDeEditalIA;
import br.com.romenig.plataforma.edital.exception.FalhaNaExtracaoException;

import tools.jackson.databind.ObjectMapper;

/**
 * Fluxo de aceite do incremento A da HU07: upload do PDF, extracao pela IA
 * (fake, deterministico), status da importacao e deduplicacao por SHA-256.
 *
 * <p>Mesmo esqueleto dos demais testes: H2 em memoria com as migrations do
 * Flyway, camada HTTP, {@code @Transactional} com rollback por teste. A IA e a
 * {@code ExtratorDeEditalIaFake} (perfil de teste) - nenhum provedor real e
 * contatado.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ImportacaoDeEditalTest {

    private static final String SENHA = "senha1234";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CodificadorDeSenha codificador;

    @Autowired
    private ObjectMapper json;

    @MockitoSpyBean
    private ExtratorDeEditalIA extrator;

    @Test
    void aprovacaoPreservaTopicoMaiorQue255Caracteres() throws Exception {
        criarAdminNoBanco("admin.topico.longo@email.com");
        String token = tokenDe("admin.topico.longo@email.com");
        long id = ((Number) carregarPaginaDeUpload(token, pdfComDuasPaginas()).get("id")).longValue();
        String topico = "Conteudo programatico completo. ".repeat(60);
        var estrutura = new br.com.romenig.plataforma.edital.extracao.EditalExtraido(
                "Edital com texto completo", "Orgao", 2026, List.of(), List.of(
                new br.com.romenig.plataforma.edital.extracao.EditalExtraido.DisciplinaExtraido("Disciplina", 1, List.of(
                new br.com.romenig.plataforma.edital.extracao.EditalExtraido.AssuntoExtraido("Assunto", 1, List.of(
                new br.com.romenig.plataforma.edital.extracao.EditalExtraido.SubassuntoExtraido(topico, 2)))))));
        mockMvc.perform(put("/api/admin/editais/importacoes/{id}/conteudo", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(estrutura)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
        assertThat(jdbc.queryForObject("SELECT nome FROM conteudo WHERE pai_id IS NOT NULL", String.class))
                .isEqualTo(topico);
        mockMvc.perform(get("/api/editais").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].disciplinas[0].assuntos[0].subassuntos[0].nome").value(topico));
    }

    @Test
    void revisaoManualRecuperaFalhaSemNovaChamadaIaEPermiteAprovacao() throws Exception {
        criarAdminNoBanco("admin.manual@email.com");
        String token = tokenDe("admin.manual@email.com");
        doThrow(new FalhaNaExtracaoException("Sem saldo.")).when(extrator).extrair(anyList());
        Map<String, Object> importacao = carregarPaginaDeUpload(token, pdfComDuasPaginas());
        long id = ((Number) importacao.get("id")).longValue();
        String estrutura = json.writeValueAsString(new br.com.romenig.plataforma.edital.extracao.ExtratorDeEditalIaFake()
                .extrair(List.of("Pagina 1", "Pagina 2")));
        mockMvc.perform(put("/api/admin/editais/importacoes/{id}/conteudo", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(estrutura))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGUARDANDO_REVISAO"))
                .andExpect(jsonPath("$.errosEmJson").value(org.hamcrest.Matchers.nullValue()));
        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APROVADO"));
        verify(extrator, times(1)).extrair(anyList());
        mockMvc.perform(put("/api/admin/editais/importacoes/{id}/conteudo", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(estrutura))
                .andExpect(status().isConflict());
    }

    @Test
    void revisaoManualInvalidaNaoPermiteAprovacao() throws Exception {
        criarAdminNoBanco("admin.manual.invalida@email.com");
        String token = tokenDe("admin.manual.invalida@email.com");
        doThrow(new FalhaNaExtracaoException("Sem saldo.")).when(extrator).extrair(anyList());
        long id = ((Number) carregarPaginaDeUpload(token, pdfComDuasPaginas()).get("id")).longValue();
        mockMvc.perform(put("/api/admin/editais/importacoes/{id}/conteudo", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"titulo":"Manual","orgao":"Orgao","ano":2026,"concursos":[],"disciplinas":[]}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.errosEmJson", org.hamcrest.Matchers.containsString("disciplinas")));
        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());
    }

    @Test
    void falhaDeIaPreservaPdfECausaEReprocessamentoLimpaErro() throws Exception {
        criarAdminNoBanco("admin.falha@email.com");
        String token = tokenDe("admin.falha@email.com");
        doThrow(new FalhaNaExtracaoException("Provedor sem saldo.")).when(extrator).extrair(anyList());
        Map<String, Object> importacao = carregarPaginaDeUpload(token, pdfComDuasPaginas());
        assertThat(importacao.get("status")).isEqualTo("FALHA");
        assertThat(importacao.get("errosEmJson").toString()).contains("extracao", "Provedor sem saldo.");
        long id = ((Number) importacao.get("id")).longValue();
        mockMvc.perform(get("/api/admin/editais/importacoes/{id}/pdf", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
        doCallRealMethod().when(extrator).extrair(anyList());
        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/reprocessar", id)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGUARDANDO_REVISAO"))
                .andExpect(jsonPath("$.errosEmJson").value(org.hamcrest.Matchers.nullValue()));
    }

    // -----------------------------------------------------------------------
    // Auxiliares
    // -----------------------------------------------------------------------

    private long criarAdminNoBanco(String email) {
        String hash = codificador.codificar(SENHA);
        jdbc.update("""
                INSERT INTO usuario (nome, email, senha_hash, perfil_id)
                VALUES ('Ana Souza', ?, ?, (SELECT id FROM perfil WHERE nome = 'ADMIN'))
                """, email, hash);
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private String tokenDe(String email) throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "%s", "senha": "%s" }
                                """.formatted(email, SENHA)))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> corpo = json.readValue(resultado.getResponse().getContentAsString(), Map.class);
        return corpo.get("token").toString();
    }

    /** PDF com duas paginas, gerado em memoria (nao commita binario). */
    private MockMultipartFile pdfComDuasPaginas() throws IOException {
        return new MockMultipartFile("arquivo", "edital.pdf",
                MediaType.APPLICATION_PDF_VALUE, gerarPdf());
    }

    private byte[] gerarPdf() throws IOException {
        try (PDDocument documento = new PDDocument()) {
            adicionarPagina(documento, "EDITAL DE CONCURSO PUBLICO");
            adicionarPagina(documento, "LINGUA PORTUGUESA");
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

    // -----------------------------------------------------------------------
    // Upload + extracao
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("upload do PDF devolve 201 com a extracao aguardando revisao")
    void uploadDePdfDevolveExtracaoParaRevisao() throws Exception {
        criarAdminNoBanco("admin.upload@email.com");
        String token = tokenDe("admin.upload@email.com");

        mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(pdfComDuasPaginas())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("AGUARDANDO_REVISAO"))
                .andExpect(jsonPath("$.totalPaginas").value(2))
                .andExpect(jsonPath("$.nomeArquivo").value("edital.pdf"))
                .andExpect(jsonPath("$.conteudoEmJson",
                        org.hamcrest.Matchers.containsString("Lingua Portuguesa")));
    }

    @Test
    @DisplayName("a lista de importacoes vem da mais recente para a mais antiga")
    void listaDeImportacoesNaOrdemDescrescente() throws Exception {
        criarAdminNoBanco("admin.lista@email.com");
        String token = tokenDe("admin.lista@email.com");

        mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(pdfComDuasPaginas())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated());

        MvcResult resultado = mockMvc.perform(get("/api/admin/editais/importacoes")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        List<Map<String, Object>> lista = json.readValue(resultado.getResponse().getContentAsString(), List.class);
        assertThat(lista).hasSize(1);
        assertThat(lista.get(0).get("status")).isEqualTo("AGUARDANDO_REVISAO");
    }

    @Test
    @DisplayName("arquivo que nao e PDF responde 400 com o campo arquivo")
    void arquivoQueNaoEhPdfResponde400() throws Exception {
        criarAdminNoBanco("admin.nopdf@email.com");
        String token = tokenDe("admin.nopdf@email.com");

        MockMultipartFile naoPdf = new MockMultipartFile("arquivo", "edital.txt",
                MediaType.TEXT_PLAIN_VALUE, "isto nao e um pdf".getBytes(StandardCharsets.UTF_8));

        mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(naoPdf)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("arquivo"));
    }

    @Test
    @DisplayName("mesmo PDF importado duas vezes cai como duplicado (SHA-256)")
    void mesmoPdfImportadoDuasVezesFicaDuplicado() throws Exception {
        criarAdminNoBanco("admin.duplicado@email.com");
        String token = tokenDe("admin.duplicado@email.com");

        MockMultipartFile pdf = pdfComDuasPaginas();

        mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(pdf)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated());

        mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(pdf)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erros[0].campo").value("arquivo"));
    }

    @Test
    @DisplayName("ALUNO recebe 403 no upload mesmo com o POST da HU07")
    void alunoRecebe403NoUpload() throws Exception {
        jdbc.update("""
                INSERT INTO usuario (nome, email, senha_hash, perfil_id)
                VALUES ('Aluno', 'aluno.upload@email.com', ?, (SELECT id FROM perfil WHERE nome = 'ALUNO'))
                """, codificador.codificar(SENHA));
        String token = tokenDe("aluno.upload@email.com");

        mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(pdfComDuasPaginas())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erros[0].campo").value("autorizacao"));
    }

    // -----------------------------------------------------------------------
    // Revisao, aprovacao e listagem publica (incremento A da HU07)
    // -----------------------------------------------------------------------

    @Test
    @DisplayName("fluxo completo: upload, revisao, aprovacao e edital no catalogo")
    void fluxoCompletoDeImportacaoAteOCatalogo() throws Exception {
        criarAdminNoBanco("admin.fluxo@email.com");
        String token = tokenDe("admin.fluxo@email.com");

        Map<String, Object> importacao = carregarPaginaDeUpload(token, pdfComDuasPaginas());
        Long id = ((Number) importacao.get("id")).longValue();

        // Revisao manual: devolve o proprio conteudo da IA (fake), que e valido.
        mockMvc.perform(put("/api/admin/editais/importacoes/{id}/conteudo", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content((String) importacao.get("conteudoEmJson")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGUARDANDO_REVISAO"))
                .andExpect(jsonPath("$.errosEmJson").value(org.hamcrest.Matchers.nullValue()));

        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APROVADO"));

        mockMvc.perform(get("/api/editais")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("admin.fluxo@email.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].titulo").value("Concurso Publico Exemplo"))
                .andExpect(jsonPath("$[0].disciplinas[0].nome").value("Lingua Portuguesa"))
                .andExpect(jsonPath("$[0].concursos[0].cargos[0].nome").value("Professor"));
    }

    @Test
    @DisplayName("revisao com estrutura invalida persiste os erros e a aprovacao e bloqueada")
    void revisaoInvalidaBloqueiaAprovacao() throws Exception {
        criarAdminNoBanco("admin.invalida@email.com");
        String token = tokenDe("admin.invalida@email.com");

        Map<String, Object> importacao = carregarPaginaDeUpload(token, pdfComDuasPaginas());
        Long id = ((Number) importacao.get("id")).longValue();

        String conteudoInvalido = """
                {
                  "titulo": "Concurso Publico Exemplo",
                  "orgao": "Prefeitura de Exemplo",
                  "ano": 2026,
                  "concursos": [],
                  "disciplinas": [
                    { "nome": "Matematica", "pagina": 99, "assuntos": [] }
                  ]
                }
                """;

        mockMvc.perform(put("/api/admin/editais/importacoes/{id}/conteudo", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(conteudoInvalido))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("AGUARDANDO_REVISAO"))
                .andExpect(jsonPath("$.errosEmJson",
                        org.hamcrest.Matchers.containsString("disciplinas[0].pagina")));

        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("segundo edital aprovado com o mesmo titulo/orgao/ano cai como duplicado")
    void editalDuplicadoPorIdentificacaoBloqueiaAprovacao() throws Exception {
        criarAdminNoBanco("admin.dup2@email.com");
        String token = tokenDe("admin.dup2@email.com");

        // A IA fake devolve sempre o mesmo titulo/orgao/ano, com paginas validas
        // no intervalo de qualquer um dos dois PDFs: o conteudo ja chega valido.
        Map<String, Object> primeira = carregarPaginaDeUpload(token, pdfComDuasPaginas());

        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar",
                        ((Number) primeira.get("id")).longValue())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());

        MockMultipartFile outroPdf = new MockMultipartFile("arquivo", "edital2.pdf",
                MediaType.APPLICATION_PDF_VALUE, gerarPdfComTresPaginas());

        Map<String, Object> segunda = carregarPaginaDeUpload(token, outroPdf);

        // O segundo upload gera importacao valida, mas a aprovacao esbarra no
        // unico (titulo, orgao, ano) ja existente.
        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar",
                        ((Number) segunda.get("id")).longValue())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erros[0].campo").value("edital"));
    }

    @Test
    @DisplayName("ALUNO autenticado tambem le o catalogo de editais aprovados")
    void alunoLeOCatalogoDeEditais() throws Exception {
        criarAdminNoBanco("admin.catalogo@email.com");
        String tokenAdmin = tokenDe("admin.catalogo@email.com");

        Map<String, Object> importacao = carregarPaginaDeUpload(tokenAdmin, pdfComDuasPaginas());
        mockMvc.perform(post("/api/admin/editais/importacoes/{id}/aprovar",
                        ((Number) importacao.get("id")).longValue())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenAdmin))
                .andExpect(status().isOk());

        jdbc.update("""
                INSERT INTO usuario (nome, email, senha_hash, perfil_id)
                VALUES ('Aluno', 'aluno.catalogo@email.com', ?, (SELECT id FROM perfil WHERE nome = 'ALUNO'))
                """, codificador.codificar(SENHA));

        mockMvc.perform(get("/api/editais").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("aluno.catalogo@email.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].titulo").value("Concurso Publico Exemplo"));
    }

    private Map<String, Object> carregarPaginaDeUpload(String token, MockMultipartFile pdf) throws Exception {
        MvcResult resultado = mockMvc.perform(multipart("/api/admin/editais/importacoes")
                        .file(pdf)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andReturn();

        return json.readValue(resultado.getResponse().getContentAsString(), Map.class);
    }

    private byte[] gerarPdfComTresPaginas() throws IOException {
        try (PDDocument documento = new PDDocument()) {
            adicionarPagina(documento, "EDITAL DE CONCURSO PUBLICO");
            adicionarPagina(documento, "LINGUA PORTUGUESA");
            adicionarPagina(documento, "MATEMATICA");
            ByteArrayOutputStream saida = new ByteArrayOutputStream();
            documento.save(saida);
            return saida.toByteArray();
        }
    }
}
