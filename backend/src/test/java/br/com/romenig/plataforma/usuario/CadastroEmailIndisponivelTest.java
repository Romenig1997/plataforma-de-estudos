package br.com.romenig.plataforma.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = {
        "plataforma.email.exigir-confirmacao=true",
        "plataforma.email.transporte=brevo",
        "plataforma.email.brevo.chave=",
        "plataforma.email.remetente=contato@example.com"
})
@AutoConfigureMockMvc
class CadastroEmailIndisponivelTest {
    @Autowired MockMvc mockMvc;
    @Autowired UsuarioRepository usuarios;

    @Test void retornaErroClaroERolaCadastroSemEntregaDoEmail() throws Exception {
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nome\":\"Ana\",\"email\":\"email-indisponivel@example.com\",\"senha\":\"senha1234\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.erros[0].campo").value("email"));
        assertThat(usuarios.existsByEmail("email-indisponivel@example.com")).isFalse();
    }
}
