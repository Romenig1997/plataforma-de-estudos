package br.com.romenig.plataforma.perfil.foto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

import javax.imageio.ImageIO;

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

import br.com.romenig.plataforma.ContasDeTeste;
import tools.jackson.databind.ObjectMapper;

/**
 * Foto do perfil (HU03): validada e reduzida no backend, gravada no Storage
 * (em memoria nos testes) e com a URL salva em {@code usuario.avatar_url}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class FotoPerfilTest {

    @Autowired MockMvc http;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired ArmazenamentoEmMemoria armazenamento;

    String token(String email) {
        return ContasDeTeste.criar(jdbc, "Aluno", email, "ALUNO");
    }

    byte[] foto(String formato, int largura, int altura) throws Exception {
        var saida = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(largura, altura, BufferedImage.TYPE_INT_RGB), formato, saida);
        return saida.toByteArray();
    }

    ResultActions enviar(String token, byte[] bytes, String mime) throws Exception {
        return http.perform(multipart("/api/perfil/foto")
                .file(new MockMultipartFile("arquivo", "foto", mime, bytes))
                .header("Authorization", "Bearer " + token));
    }

    String urlEnviada(String token, byte[] bytes) throws Exception {
        String corpo = enviar(token, bytes, "image/png").andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(corpo).path("avatarUrl").asText();
    }

    String avatarNoPerfil(String token) throws Exception {
        String corpo = http.perform(get("/api/perfil").header("Authorization", "Bearer " + token))
                .andReturn().getResponse().getContentAsString();
        var valor = json.readTree(corpo).path("avatarUrl");
        return valor.isNull() ? null : valor.asText();
    }

    @Test
    void exigeAutenticacao() throws Exception {
        http.perform(delete("/api/perfil/foto")).andExpect(status().isUnauthorized());
        http.perform(multipart("/api/perfil/foto").file(new MockMultipartFile("arquivo", foto("png", 2, 2))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void salvaNoStorageNaPastaDaIdentidadeEPersisteAUrl() throws Exception {
        String t = token("foto.b@email.com");
        String authId = jdbc.queryForObject("SELECT auth_id FROM usuario WHERE email = 'foto.b@email.com'", Object.class).toString();

        String url = urlEnviada(t, foto("jpeg", 1000, 500));

        assertThat(url).startsWith(ArmazenamentoEmMemoria.PREFIXO + authId + "/");
        var imagem = ImageIO.read(new ByteArrayInputStream(armazenamento.arquivo(url)));
        assertThat(imagem.getWidth()).isEqualTo(512);
        assertThat(imagem.getHeight()).isEqualTo(256);
        assertThat(avatarNoPerfil(t)).isEqualTo(url);
        http.perform(get("/api/auth/me").header("Authorization", "Bearer " + t))
                .andExpect(jsonPath("$.avatarUrl").value(url));
    }

    @Test
    void substituirApagaOArquivoAnterior() throws Exception {
        String t = token("foto.c@email.com");
        String primeira = urlEnviada(t, foto("png", 5, 6));
        String segunda = urlEnviada(t, foto("png", 2, 2));

        assertThat(segunda).isNotEqualTo(primeira);
        assertThat(armazenamento.arquivo(primeira)).isNull();
        assertThat(avatarNoPerfil(t)).isEqualTo(segunda);
    }

    @Test
    void cadaAlunoTemSuaPropriaFoto() throws Exception {
        String a = token("foto.d@email.com");
        String b = token("foto.e@email.com");
        String urlDeA = urlEnviada(a, foto("png", 5, 6));

        assertThat(avatarNoPerfil(b)).isNull();
        urlEnviada(b, foto("png", 2, 2));
        assertThat(avatarNoPerfil(a)).isEqualTo(urlDeA);
    }

    @Test
    void arquivoFalsoTamanhoOuDimensoesInvalidosPreservamFoto() throws Exception {
        String t = token("foto.f@email.com");
        String salva = urlEnviada(t, foto("png", 2, 2));

        for (byte[] invalida : new byte[][] {"arquivo falso".getBytes(), new byte[0],
                new byte[NormalizadorFoto.LIMITE_BYTES + 1], foto("png", 4097, 1), foto("gif", 2, 2)}) {
            enviar(t, invalida, "image/png")
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.erros[0].campo").value("foto"));
        }
        assertThat(avatarNoPerfil(t)).isEqualTo(salva);
    }

    @Test
    void removerFotoEIdempotenteENaoMudaOutrosDados() throws Exception {
        String t = token("foto.g@email.com");
        String url = urlEnviada(t, foto("png", 2, 2));

        for (int i = 0; i < 2; i++) {
            http.perform(delete("/api/perfil/foto").header("Authorization", "Bearer " + t))
                    .andExpect(status().isNoContent());
        }
        assertThat(avatarNoPerfil(t)).isNull();
        assertThat(armazenamento.arquivo(url)).isNull();
        http.perform(get("/api/perfil").header("Authorization", "Bearer " + t))
                .andExpect(jsonPath("$.nome").value("Aluno"));
    }

    @Test
    void editarNomePreservaFotoECorsPermiteRemocao() throws Exception {
        String t = token("foto.h@email.com");
        String url = urlEnviada(t, foto("png", 2, 2));

        http.perform(put("/api/perfil").header("Authorization", "Bearer " + t)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Nome alterado\",\"metaEstudoSemanal\":10,\"objetivoMotivacao\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(url));
        http.perform(options("/api/perfil/foto")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "DELETE"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Methods", org.hamcrest.Matchers.containsString("DELETE")));
    }
}
