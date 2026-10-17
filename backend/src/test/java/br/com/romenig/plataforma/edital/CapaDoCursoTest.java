package br.com.romenig.plataforma.edital;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Map;

import javax.imageio.ImageIO;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.perfil.foto.NormalizadorFoto;
import br.com.romenig.plataforma.usuario.CodificadorDeSenha;
import tools.jackson.databind.ObjectMapper;

/** Banner do card do curso e nome/sigla do orgao editaveis pelo admin. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CapaDoCursoTest {

    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired CodificadorDeSenha senhas;
    @Autowired ObjectMapper json;

    private String token(String email, String perfil) throws Exception {
        jdbc.update("INSERT INTO usuario(nome,email,senha_hash,perfil_id) VALUES('Pessoa',?,?,(SELECT id FROM perfil WHERE nome=?))",
                email, senhas.codificar("senha1234"), perfil);
        String resposta = http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "senha", "senha1234"))))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(resposta).path("token").asText();
    }

    private long curso(String titulo, String orgao) {
        jdbc.update("INSERT INTO edital(titulo,orgao,ano,criado_em) VALUES(?,?,2026,CURRENT_TIMESTAMP)", titulo, orgao);
        return jdbc.queryForObject("SELECT id FROM edital WHERE titulo=?", Long.class, titulo);
    }

    private static byte[] imagem(String formato, int largura, int altura) throws Exception {
        var saida = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB), formato, saida);
        return saida.toByteArray();
    }

    private ResultActions enviar(String token, long editalId, byte[] bytes) throws Exception {
        var requisicao = multipart("/api/admin/editais/" + editalId + "/banner")
                .file(new MockMultipartFile("arquivo", "banner", "image/jpeg", bytes));
        return http.perform(token == null ? requisicao : requisicao.header("Authorization", token));
    }

    @Test
    void bannerEPublicoReduzidoECacheavelEApareceNaListagem() throws Exception {
        String admin = token("capa.admin@email.com", "ADMIN"), aluno = token("capa.aluno@email.com", "ALUNO");
        long id = curso("Curso com banner", "Polícia Militar de Pernambuco");

        http.perform(get("/api/editais/" + id + "/banner")).andExpect(status().isNotFound());
        enviar(admin, id, imagem("png", 3200, 1000)).andExpect(status().isOk()).andExpect(jsonPath("$.bannerVersao").isNumber());

        // Sem token: qualquer pessoa ve o banner, ja reduzido para 1600 px em JPEG.
        byte[] salvo = http.perform(get("/api/editais/" + id + "/banner"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(header().string("Cache-Control", Matchers.containsString("max-age")))
                .andReturn().getResponse().getContentAsByteArray();
        BufferedImage lida = ImageIO.read(new ByteArrayInputStream(salvo));
        assertThat(lida.getWidth()).isEqualTo(1600);
        assertThat(lida.getHeight()).isEqualTo(500);

        http.perform(get("/api/editais").header("Authorization", aluno))
                .andExpect(jsonPath("$[?(@.id==" + id + ")].bannerVersao").value(Matchers.hasItem(Matchers.notNullValue())))
                .andExpect(jsonPath("$[?(@.id==" + id + ")].sigla").value(Matchers.hasItem("PMP")));
    }

    @Test
    void soAdminEnviaRemoveOuEditaOrgao() throws Exception {
        String aluno = token("capa.aluno2@email.com", "ALUNO");
        long id = curso("Curso protegido", "Tribunal de Justiça");

        enviar(null, id, imagem("png", 10, 10)).andExpect(status().isUnauthorized());
        enviar(aluno, id, imagem("png", 10, 10)).andExpect(status().isForbidden());
        http.perform(delete("/api/admin/editais/" + id + "/banner").header("Authorization", aluno)).andExpect(status().isForbidden());
        http.perform(put("/api/admin/editais/" + id + "/orgao").header("Authorization", aluno).contentType(MediaType.APPLICATION_JSON)
                .content("{\"orgao\":\"Outro\",\"sigla\":\"OU\"}")).andExpect(status().isForbidden());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM edital_banner", Integer.class)).isZero();
    }

    @Test
    void arquivoInvalidoOuCursoInexistenteNaoGuardamBanner() throws Exception {
        String admin = token("capa.admin3@email.com", "ADMIN");
        long id = curso("Curso validado", "Corpo de Bombeiros");

        for (byte[] invalido : new byte[][] {"nao e imagem".getBytes(), new byte[0], new byte[NormalizadorFoto.LIMITE_BYTES + 1], imagem("gif", 4, 4)}) {
            enviar(admin, id, invalido).andExpect(status().isBadRequest()).andExpect(jsonPath("$.erros[0].campo").value("banner"));
        }
        enviar(admin, 999_999, imagem("png", 4, 4)).andExpect(status().isNotFound());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM edital_banner", Integer.class)).isZero();
    }

    @Test
    void removerBannerEExcluirCursoApagamAImagem() throws Exception {
        String admin = token("capa.admin4@email.com", "ADMIN");
        long id = curso("Curso removivel", "Receita Federal");

        enviar(admin, id, imagem("jpeg", 40, 20)).andExpect(status().isOk());
        for (int vez = 0; vez < 2; vez++) {
            http.perform(delete("/api/admin/editais/" + id + "/banner").header("Authorization", admin)).andExpect(status().isNoContent());
        }
        http.perform(get("/api/editais/" + id + "/banner")).andExpect(status().isNotFound());

        enviar(admin, id, imagem("jpeg", 40, 20)).andExpect(status().isOk());
        http.perform(delete("/api/admin/editais/" + id).header("Authorization", admin)).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT count(*) FROM edital_banner", Integer.class)).isZero();
    }

    @Test
    void adminEditaNomeESiglaDoOrgaoNoBanco() throws Exception {
        String admin = token("capa.admin5@email.com", "ADMIN");
        long id = curso("Curso editavel", "Policia Civil");

        http.perform(put("/api/admin/editais/" + id + "/orgao").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orgao\":\"  Polícia Civil de Pernambuco \",\"sigla\":\" PC-PE \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orgao").value("Polícia Civil de Pernambuco"))
                .andExpect(jsonPath("$.sigla").value("PC-PE"));
        assertThat(jdbc.queryForMap("SELECT orgao, sigla FROM edital WHERE id=?", id))
                .containsEntry("ORGAO", "Polícia Civil de Pernambuco").containsEntry("SIGLA", "PC-PE");

        http.perform(put("/api/admin/editais/" + id + "/orgao").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"orgao\":\" \",\"sigla\":\"MUITO-MAIS-QUE-VINTE-LETRAS\"}")).andExpect(status().isBadRequest());
        http.perform(put("/api/admin/editais/999999/orgao").header("Authorization", admin).contentType(MediaType.APPLICATION_JSON)
                .content("{\"orgao\":\"Orgao\",\"sigla\":\"OR\"}")).andExpect(status().isNotFound());
    }

    @Test
    void siglaGeradaPeloNomeDoOrgao() {
        assertThat(SiglaDoOrgao.gerar("Polícia Militar de Pernambuco")).isEqualTo("PMP");
        assertThat(SiglaDoOrgao.gerar("Corpo de Bombeiros Militar CBM-PE")).isEqualTo("CBM-PE");
        assertThat(SiglaDoOrgao.gerar("Tribunal de Justiça do Estado")).isEqualTo("TJE");
        assertThat(SiglaDoOrgao.gerar("  ")).isEmpty();
        assertThat(new Edital("Curso", "Receita Federal", 2026, null, null).getSigla()).isEqualTo("RF");
    }
}
