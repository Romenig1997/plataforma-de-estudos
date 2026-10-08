package br.com.romenig.plataforma.perfil;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.usuario.UsuarioRepository;

import tools.jackson.databind.ObjectMapper;

/**
 * Criterios de aceite da HU03 - Gerenciamento de Perfis.
 *
 * <p>Mesmo esqueleto do {@code AutenticacaoTest}: roda de ponta a ponta da
 * camada HTTP ate o banco, em H2 em memoria com o mesmo schema.sql do
 * Supabase. Cada teste cadastra a conta pela API publica da HU01, faz login
 * para obter um token de verdade e entao exercita o recurso - o caminho real,
 * sem autenticacao simulada.
 *
 * <p>{@code @Transactional} da rollback por teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PerfilTest {

    private static final String SENHA = "senha1234";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private ObjectMapper json;

    // -----------------------------------------------------------------------
    // Auxiliares
    // -----------------------------------------------------------------------

    private String corpoCadastro(String email) {
        return """
                {
                  "nome": "Ana Souza",
                  "email": "%s",
                  "senha": "%s"
                }
                """.formatted(email, SENHA);
    }

    private long criarConta(String email) throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoCadastro(email)))
                .andExpect(status().isCreated());

        return usuarios.findByEmail(email).orElseThrow().getId();
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

    /** Conta criada + token valido: o estado inicial de todo teste daqui. */
    private String sessaoDe(String email) throws Exception {
        criarConta(email);
        return tokenDe(email);
    }

    private String corpoPerfil(String nome, String email, String meta, String objetivo) {
        String metaJson = meta == null ? "null" : meta;
        String objetivoJson = objetivo == null ? "null"
                : "\"%s\"".formatted(objetivo.replace("\\", "\\\\").replace("\"", "\\\""));

        return """
                {
                  "nome": "%s",
                  "email": "%s",
                  "metaEstudoSemanal": %s,
                  "objetivoMotivacao": %s
                }
                """.formatted(nome, email, metaJson, objetivoJson);
    }

    // -----------------------------------------------------------------------
    // 1. Leitura do perfil
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("GET /api/perfil devolve os dados do proprio usuario com o token")
    void lePerfilComTokenValido() throws Exception {
        String token = sessaoDe("perfil.leitura@email.com");

        mockMvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.email").value("perfil.leitura@email.com"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(nullValue()))
                .andExpect(jsonPath("$.objetivoMotivacao").value(nullValue()));
    }

    @Test
    @DisplayName("GET /api/perfil sem token responde 401 em JSON")
    void bloqueiaLeituraSemToken() throws Exception {
        mockMvc.perform(get("/api/perfil"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("autenticacao"));
    }

    /** A resposta monta o DTO na mao - o senha_hash jamais pode vazar. */
    @Test
    @DisplayName("a resposta do perfil nao expoe senha nem hash")
    void naoExpoeSenhaNemHash() throws Exception {
        String token = sessaoDe("perfil.sigilo@email.com");

        String resposta = mockMvc.perform(get("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(resposta)
                .doesNotContain("senha1234")
                .doesNotContain("senhaHash")
                .doesNotContain("senha_hash");
    }

    // -----------------------------------------------------------------------
    // 2. Atualizacao valida
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("PUT valido atualiza todos os campos e a alteracao persiste")
    void atualizaEPermaneceAposNovaLeitura() throws Exception {
        String token = sessaoDe("perfil.atualiza@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Paula Souza", "perfil.atualiza@email.com",
                                "10", "Passar no concurso da Receita Federal")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Paula Souza"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(10))
                .andExpect(jsonPath("$.objetivoMotivacao").value("Passar no concurso da Receita Federal"));

        // Releitura em outra chamada: o que vale e o que ficou no banco.
        mockMvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Paula Souza"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(10))
                .andExpect(jsonPath("$.objetivoMotivacao")
                        .value("Passar no concurso da Receita Federal"));
    }

    /**
     * Maiusculas sao normalizadas, igual ao cadastro e ao login da HU01/HU02.
     *
     * <p>Espaco nas pontas e recusado pelo {@code @Email} antes de chegar ao
     * service - mesma conduta da HU02, onde o frontend ja envia o e-mail limpo.
     */
    @Test
    @DisplayName("PUT aceita campos opcionais nulos e normaliza a caixa do e-mail")
    void atualizaComCamposOpcionaisNulosEEmailNormalizado() throws Exception {
        String token = sessaoDe("perfil.normaliza@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "nome": "Ana Souza",
                                  "email": "Perfil.Normaliza@Email.COM",
                                  "metaEstudoSemanal": null,
                                  "objetivoMotivacao": null
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("perfil.normaliza@email.com"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(nullValue()))
                .andExpect(jsonPath("$.objetivoMotivacao").value(nullValue()));
    }

    /**
     * Trocar o e-mail e permitido, mas o novo precisa ser unico. Aqui a conta
     * reivindica o e-mail de outra pessoa - e a API tem de recusar.
     */
    @Test
    @DisplayName("PUT com e-mail de outro usuario responde 409 com erro no campo email")
    void recusaEmailDeOutroUsuario() throws Exception {
        sessaoDe("dono.original@email.com");
        String token = sessaoDe("perfil.email.trocado@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "dono.original@email.com", null, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erros[0].campo").value("email"))
                .andExpect(jsonPath("$.erros[0].mensagem")
                        .value("Ja existe um usuario cadastrado com este e-mail."));
    }

    /**
     * Regressao especifica da HU03: enviar o PROPRIO e-mail nao pode cair na
     * regra de duplicidade - do contrario salvar o perfil sem trocar o e-mail
     * seria sempre um 409.
     */
    @Test
    @DisplayName("PUT mantendo o proprio e-mail nao e tratado como duplicado")
    void mantemProprioEmailSemConflito() throws Exception {
        String token = sessaoDe("perfil.proprio.email@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "perfil.proprio.email@email.com",
                                "20", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("perfil.proprio.email@email.com"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(20));
    }

    @Test
    @DisplayName("PUT sem token responde 401")
    void bloqueiaAtualizacaoSemToken() throws Exception {
        mockMvc.perform(put("/api/perfil")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "anonimo@email.com", null, null)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("autenticacao"));
    }

    // -----------------------------------------------------------------------
    // 3. Validacao dos campos
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("PUT sem nome ou com e-mail invalido responde 400 com o erro em cada campo")
    void validaNomeEObrigatorioEEmailFormato() throws Exception {
        String token = sessaoDe("perfil.validacao@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("", "nao-e-um-email", null, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'nome')].mensagem")
                        .value("O nome e obrigatorio."))
                .andExpect(jsonPath("$.erros[?(@.campo == 'email')].mensagem")
                        .value("Informe um e-mail valido."));
    }

    @Test
    @DisplayName("meta semanal fora de 1 a 168 horas responde 400 com erro no campo")
    void validaIntervaloDaMetaSemanal() throws Exception {
        String token = sessaoDe("perfil.meta.invalida@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "perfil.meta.invalida@email.com",
                                "0", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("metaEstudoSemanal"))
                .andExpect(jsonPath("$.erros[0].mensagem")
                        .value("A meta semanal deve ser de no minimo 1 hora."));

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "perfil.meta.invalida@email.com",
                                "169", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("metaEstudoSemanal"))
                .andExpect(jsonPath("$.erros[0].mensagem")
                        .value("A meta semanal deve ter no maximo 168 horas."));
    }

    @Test
    @DisplayName("objetivo acima de 500 caracteres responde 400 com erro no campo")
    void validaTamanhoDoObjetivo() throws Exception {
        String token = sessaoDe("perfil.objetivo.longo@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Ana Souza", "perfil.objetivo.longo@email.com",
                                null, "x".repeat(501))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("objetivoMotivacao"))
                .andExpect(jsonPath("$.erros[0].mensagem")
                        .value("O objetivo deve ter no maximo 500 caracteres."));
    }

    /**
     * Cada um edita o proprio perfil: o token de uma conta nao alcanca a
     * conta de outra. O id vem do token, nunca do corpo da requisicao.
     */
    @Test
    @DisplayName("cada conta edita apenas o proprio perfil")
    void naoAlcancouPerfilDeOutraConta() throws Exception {
        sessaoDe("dono.bloco@email.com");
        String tokenOutra = sessaoDe("outra.bloco@email.com");

        mockMvc.perform(put("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenOutra)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("Nome Alterado", "outra.bloco@email.com", "5", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Nome Alterado"));

        // O dono original continua com o cadastro intacto.
        mockMvc.perform(get("/api/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("dono.bloco@email.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.metaEstudoSemanal").value(nullValue()));
    }
}
