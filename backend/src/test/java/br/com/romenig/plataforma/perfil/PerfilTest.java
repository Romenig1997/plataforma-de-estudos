package br.com.romenig.plataforma.perfil;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.ContasDeTeste;

/**
 * Criterios de aceite da HU03 - Gerenciamento de Perfis.
 *
 * <p>Roda de ponta a ponta da camada HTTP ate o banco (H2 com as mesmas
 * migrations do Supabase), com access tokens no formato do Supabase Auth.
 * Nome, meta e objetivo sao editaveis; o e-mail e do Supabase Auth e nao
 * muda por aqui.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PerfilTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private final Map<String, String> tokens = new HashMap<>();

    private String sessaoDe(String email) {
        String token = ContasDeTeste.criar(jdbc, "Ana Souza", email, "ALUNO");
        tokens.put(email, token);
        return token;
    }

    private String corpoPerfil(String nome, String meta, String objetivo) {
        String metaJson = meta == null ? "null" : meta;
        String objetivoJson = objetivo == null ? "null"
                : "\"%s\"".formatted(objetivo.replace("\\", "\\\\").replace("\"", "\\\""));

        return """
                {
                  "nome": "%s",
                  "metaEstudoSemanal": %s,
                  "objetivoMotivacao": %s
                }
                """.formatted(nome, metaJson, objetivoJson);
    }

    // -----------------------------------------------------------------------
    // 1. Leitura do perfil
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/perfil devolve nome, e-mail, papel e foto do proprio usuario")
    void lePerfilComTokenValido() throws Exception {
        String token = sessaoDe("perfil.leitura@email.com");

        mockMvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.email").value("perfil.leitura@email.com"))
                .andExpect(jsonPath("$.perfil").value("ALUNO"))
                .andExpect(jsonPath("$.avatarUrl").value(nullValue()))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(nullValue()))
                .andExpect(jsonPath("$.objetivoMotivacao").value(nullValue()))
                .andExpect(jsonPath("$.atualizadoEm").isNotEmpty());
    }

    @Test
    @DisplayName("GET /api/perfil sem token responde 401 em JSON")
    void bloqueiaLeituraSemToken() throws Exception {
        mockMvc.perform(get("/api/perfil"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("autenticacao"));
    }

    // -----------------------------------------------------------------------
    // 2. Atualizacao valida
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("PUT valido atualiza os campos e a alteracao persiste imediatamente")
    void atualizaEPermaneceAposNovaLeitura() throws Exception {
        String token = sessaoDe("perfil.atualiza@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Paula Souza", "10", "Passar no concurso da Receita Federal")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Paula Souza"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(10))
                .andExpect(jsonPath("$.objetivoMotivacao").value("Passar no concurso da Receita Federal"));

        // O que vale e o que ficou no banco.
        mockMvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Paula Souza"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(10));
    }

    @Test
    @DisplayName("PUT ignora e-mail no corpo: o e-mail pertence ao Supabase Auth")
    void naoAlteraEmailPeloPerfil() throws Exception {
        String token = sessaoDe("perfil.email.fixo@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "nome": "Ana Souza", "email": "outro@email.com",
                                  "metaEstudoSemanal": null, "objetivoMotivacao": "  " }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("perfil.email.fixo@email.com"))
                .andExpect(jsonPath("$.objetivoMotivacao").value(nullValue()));
    }

    @Test
    @DisplayName("PUT sem token responde 401")
    void bloqueiaAtualizacaoSemToken() throws Exception {
        mockMvc.perform(put("/api/perfil")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", null, null)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("autenticacao"));
    }

    // -----------------------------------------------------------------------
    // 3. Validacao dos campos
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("PUT sem nome responde 400 com o erro no campo")
    void validaNomeObrigatorio() throws Exception {
        String token = sessaoDe("perfil.validacao@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("", null, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("nome"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("O nome é obrigatório."));
    }

    @Test
    @DisplayName("meta semanal fora de 1 a 168 horas responde 400 com erro no campo")
    void validaIntervaloDaMetaSemanal() throws Exception {
        String token = sessaoDe("perfil.meta.invalida@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "0", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("metaEstudoSemanal"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("A meta semanal deve ser de no mínimo 1 hora."));

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "169", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].mensagem").value("A meta semanal deve ter no máximo 168 horas."));
    }

    @Test
    @DisplayName("objetivo acima de 500 caracteres responde 400 com erro no campo")
    void validaTamanhoDoObjetivo() throws Exception {
        String token = sessaoDe("perfil.objetivo.longo@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", null, "x".repeat(501))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("objetivoMotivacao"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("O objetivo deve ter no máximo 500 caracteres."));
    }

    /** O id vem do token, nunca do corpo: uma conta nao alcanca o perfil de outra. */
    @Test
    @DisplayName("cada conta edita apenas o proprio perfil")
    void naoAlcancaPerfilDeOutraConta() throws Exception {
        sessaoDe("dono.bloco@email.com");
        String tokenOutra = sessaoDe("outra.bloco@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenOutra)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Nome Alterado", "5", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nome Alterado"));

        mockMvc.perform(get("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokens.get("dono.bloco@email.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(nullValue()));
    }
}
