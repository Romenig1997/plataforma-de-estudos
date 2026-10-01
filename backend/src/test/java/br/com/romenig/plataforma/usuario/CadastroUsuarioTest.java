package br.com.romenig.plataforma.usuario;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Criterios de aceite da HU01 - Cadastro de Usuarios.
 *
 * Roda de ponta a ponta da camada HTTP ate o banco, usando H2 em memoria e
 * o mesmo schema.sql do Supabase. Nao exige Docker nem credenciais.
 *
 * Cada teste rola em transacao propria com rollback, entao os dados de um
 * teste nao vazam para o seguinte.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CadastroUsuarioTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarios;

    private String corpo(String nome, String email, String senha) {
        return """
                {
                  "nome": "%s",
                  "email": "%s",
                  "senha": "%s"
                }
                """.formatted(nome, email, senha);
    }

    // -----------------------------------------------------------------------
    // 1. Cadastro valido
    // -----------------------------------------------------------------------
    @Test
    void cadastraUsuarioValido() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Ana Souza", "ana@email.com", "senha1234")))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/usuarios/")))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.email").value("ana@email.com"));
    }

    // -----------------------------------------------------------------------
    // 2. Nome obrigatorio
    // -----------------------------------------------------------------------
    @Test
    void rejeitaNomeObrigatorio() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("", "sem-nome@email.com", "senha1234")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("nome"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("O nome e obrigatorio."));
    }

    // -----------------------------------------------------------------------
    // 3. E-mail obrigatorio
    // -----------------------------------------------------------------------
    @Test
    void rejeitaEmailObrigatorio() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Ana Souza", "", "senha1234")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("email"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("O e-mail e obrigatorio."));
    }

    // -----------------------------------------------------------------------
    // 4. Formato de e-mail invalido
    // -----------------------------------------------------------------------
    @Test
    void rejeitaFormatoDeEmailInvalido() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Ana Souza", "nao-e-um-email", "senha1234")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("email"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Informe um e-mail valido."));
    }

    // -----------------------------------------------------------------------
    // 5. Senha com menos de 8 caracteres
    // -----------------------------------------------------------------------
    @Test
    void rejeitaSenhaComMenosDeOitoCaracteres() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Ana Souza", "curta@email.com", "s123456")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("senha"))
                .andExpect(jsonPath("$.erros[0].mensagem")
                        .value("A senha deve ter no minimo 8 caracteres."));
    }

    // -----------------------------------------------------------------------
    // 6. E-mail duplicado
    // -----------------------------------------------------------------------
    @Test
    void rejeitaEmailDuplicado() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Ana Souza", "duplicado@email.com", "senha1234")))
                .andExpect(status().isCreated());

        // Mesmo e-mail em outra caixa deve contar como duplicado
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Outra Pessoa", "DUPLICADO@email.com", "senha5678")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.erros[0].campo").value("email"));
    }

    // -----------------------------------------------------------------------
    // 7. Cadastro realizado com sucesso (persistencia de verdade)
    // -----------------------------------------------------------------------
    @Test
    void persisteUsuarioComSenhaCodificada() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Ana Souza", "persistido@email.com", "senha1234")))
                .andExpect(status().isCreated());

        Usuario salvo = usuarios.findAll().stream()
                .filter(u -> u.getEmail().equals("persistido@email.com"))
                .findFirst()
                .orElseThrow();

        org.assertj.core.api.Assertions.assertThat(salvo.getId()).isNotNull();
        org.assertj.core.api.Assertions.assertThat(salvo.getNome()).isEqualTo("Ana Souza");
        org.assertj.core.api.Assertions.assertThat(salvo.getSenhaHash())
                .isNotEqualTo("senha1234")
                .startsWith("pbkdf2-sha256$");
    }

    // -----------------------------------------------------------------------
    // Regra transversal: a senha nunca pode vazar na resposta
    // -----------------------------------------------------------------------
    @Test
    void naoExpoeSenhaNemHashNaResposta() throws Exception {
        String resposta = mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpo("Ana Souza", "sigilo@email.com", "senha1234")))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        org.assertj.core.api.Assertions.assertThat(resposta)
                .doesNotContain("senha1234")
                .doesNotContain("pbkdf2-sha256")
                .doesNotContain("senha_hash");
    }

    // -----------------------------------------------------------------------
    // O codificador realmente confere a senha
    // -----------------------------------------------------------------------
    @Test
    void codificadorConfereSenhaCorretaERejeitaErrada() {
        CodificadorDeSenha codificador = new CodificadorDeSenha(1000);

        String codigo = codificador.codificar("senha1234");

        org.assertj.core.api.Assertions.assertThat(codificador.conferir("senha1234", codigo)).isTrue();
        org.assertj.core.api.Assertions.assertThat(codificador.conferir("senhaerrada", codigo)).isFalse();

        // Dois codigos da mesma senha precisam ser diferentes (salt aleatorio)
        org.assertj.core.api.Assertions.assertThat(codificador.codificar("senha1234"))
                .isNotEqualTo(codigo);
    }

    @Test
    void rejeitaCorpoInvalidoEmJson() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("nao-e-json"))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }
}