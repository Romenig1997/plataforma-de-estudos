package br.com.romenig.plataforma.autenticacao;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.ContasDeTeste;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Criterios de aceite da HU02 com o Supabase Auth.
 *
 * <p>Login, cadastro e logout acontecem no Supabase Auth. Aqui se prova que o
 * backend so aceita access tokens legitimos do projeto: assinatura correta,
 * emissor {@code {SUPABASE_URL}/auth/v1}, audiencia {@code authenticated},
 * dentro da validade. Qualquer outro caso vira 401 no contrato JSON de erro.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AutenticacaoTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    private ResultActions me(String token) throws Exception {
        return mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token));
    }

    @Test
    @DisplayName("recurso protegido responde 200 com o access token do Supabase")
    void tokenValidoAcessaRecursoProtegido() throws Exception {
        String token = ContasDeTeste.criar(jdbc, "Ana Souza", "sessao.valida@email.com", "ALUNO");

        me(token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.email").value("sessao.valida@email.com"))
                .andExpect(jsonPath("$.perfil").value("ALUNO"));
    }

    @Test
    @DisplayName("recurso protegido sem token responde 401 em JSON")
    void semTokenResponde401() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("autenticacao"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Faca login para acessar este recurso."));
    }

    @Test
    @DisplayName("token malformado responde 401")
    void tokenMalformadoResponde401() throws Exception {
        me("isto-nao-e-um-jwt").andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token expirado responde 401")
    void tokenExpiradoResponde401() throws Exception {
        Instant passado = Instant.now().minusSeconds(7200);
        String token = ContasDeTeste.construtor(UUID.randomUUID(), "expirado@email.com", "Ana")
                .issuedAt(Date.from(passado))
                .expiration(Date.from(passado.plusSeconds(3600)))
                .compact();

        me(token).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token assinado com outra chave responde 401")
    void outraChaveResponde401() throws Exception {
        String token = ContasDeTeste.construtor(UUID.randomUUID(), "outra.chave@email.com", "Ana")
                .signWith(Keys.hmacShaKeyFor("outra-chave-qualquer-com-mais-de-32-bytes!!".getBytes(StandardCharsets.UTF_8)))
                .compact();

        me(token).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token de outro projeto Supabase (outro emissor) responde 401")
    void outroEmissorResponde401() throws Exception {
        String token = ContasDeTeste.construtor(UUID.randomUUID(), "outro.projeto@email.com", "Ana")
                .issuer("https://outro-projeto.supabase.co/auth/v1")
                .compact();

        me(token).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("a chave anon (sem audiencia authenticated) nao vale como sessao")
    void chaveAnonNaoEhSessao() throws Exception {
        String anon = Jwts.builder()
                .issuer(ContasDeTeste.EMISSOR)
                .claim("role", "anon")
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .signWith(ContasDeTeste.CHAVE)
                .compact();

        me(anon).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token sem assinatura responde 401")
    void tokenSemAssinaturaResponde401() throws Exception {
        String semAssinatura = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer(ContasDeTeste.EMISSOR)
                .audience().add("authenticated").and()
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .compact();

        me(semAssinatura).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("o perfil devolvido vem do banco, sem senha nem hash")
    void respostaNaoExpoeSenha() throws Exception {
        String token = ContasDeTeste.criar(jdbc, "Ana Souza", "sigilo@email.com", "ADMIN");

        me(token)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ADMIN"))
                .andExpect(jsonPath("$.senha").doesNotExist())
                .andExpect(jsonPath("$.senhaHash").doesNotExist());
    }

    @Test
    @DisplayName("os antigos endpoints de login e cadastro nao existem mais")
    void endpointsDeSenhaForamRemovidos() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/auth/login")
                        .contentType("application/json").content("{\"email\":\"a@a.com\",\"senha\":\"senha1234\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/usuarios")
                        .contentType("application/json").content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
