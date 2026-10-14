package br.com.romenig.plataforma.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import tools.jackson.databind.ObjectMapper;

/** Fluxos de seguranca que exigem e-mail, sem entregar token em log ou em banco. */
@SpringBootTest(properties = "plataforma.email.exigir-confirmacao=true")
@AutoConfigureMockMvc
@Transactional
@Import(SegurancaDaContaTest.ConfiguracaoDeEmail.class)
class SegurancaDaContaTest {
    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper json;
    @Autowired CaixaDeSaida caixa;

    @Test
    void confirmaEmailTrocaSenhaRevogaSessoesERedefineSenhaComLinkDeUsoUnico() throws Exception {
        mockMvc.perform(post("/api/usuarios").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"nome\":\"Ana\", \"email\":\"seguranca@email.com\", \"senha\":\"senha1234\" }"))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"email\":\"seguranca@email.com\", \"senha\":\"senha1234\" }"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erros[0].campo").value("confirmacao"));

        String confirmacao = tokenNaUrl(caixa.ultimoLink);
        mockMvc.perform(post("/api/auth/confirmar-email").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"token\":\"%s\" }".formatted(confirmacao)))
                .andExpect(status().isOk());

        String tokenInicial = entrar("senha1234");
        MvcResult troca = mockMvc.perform(post("/api/auth/alterar-senha")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenInicial)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"senhaAtual\":\"senha1234\", \"novaSenha\":\"novaSenha123\" }"))
                .andExpect(status().isOk()).andReturn();
        String tokenNovo = json.readValue(troca.getResponse().getContentAsString(), java.util.Map.class).get("token").toString();

        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenInicial))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenNovo))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/solicitar-redefinicao").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"email\":\"seguranca@email.com\" }"))
                .andExpect(status().isOk());
        String redefinicao = tokenNaUrl(caixa.ultimoLink);
        mockMvc.perform(post("/api/auth/redefinir-senha").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"token\":\"%s\", \"novaSenha\":\"senhaFinal123\" }".formatted(redefinicao)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/redefinir-senha").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"token\":\"%s\", \"novaSenha\":\"outraSenha123\" }".formatted(redefinicao)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenNovo))
                .andExpect(status().isUnauthorized());
        assertThat(entrar("senhaFinal123")).isNotBlank();
    }

    private String entrar(String senha) throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"email\":\"seguranca@email.com\", \"senha\":\"%s\" }".formatted(senha)))
                .andExpect(status().isOk()).andReturn();
        return json.readValue(resultado.getResponse().getContentAsString(), java.util.Map.class).get("token").toString();
    }

    private String tokenNaUrl(String url) {
        assertThat(url).contains("?token=");
        return url.substring(url.indexOf("?token=") + 7);
    }

    @TestConfiguration
    static class ConfiguracaoDeEmail {
        @Bean CaixaDeSaida caixaDeSaida() { return new CaixaDeSaida(); }
        @Bean @Primary NotificadorEmail notificadorDeTeste(CaixaDeSaida caixa) {
            return new NotificadorEmail() {
                @Override public void enviarConfirmacao(String destino, String link) { caixa.ultimoLink = link; }
                @Override public void enviarRedefinicaoDeSenha(String destino, String link) { caixa.ultimoLink = link; }
            };
        }
    }

    static class CaixaDeSaida { String ultimoLink; }
}
