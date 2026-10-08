package br.com.romenig.plataforma.autenticacao;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
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
 * Criterios de aceite da HU02 - Sistema de Autenticacao.
 *
 * <p>Roda de ponta a ponta da camada HTTP ate o banco, em H2 em memoria e com
 * o mesmo schema.sql do Supabase. Nao exige Docker nem credenciais.
 *
 * <p>Cada teste cria a conta de que precisa pelo endpoint publico de cadastro
 * da HU01 e so entao tenta o login. Assim o caminho exercitado e o real: a
 * pessoa se cadastra e depois entra. Nenhum teste depende de dado fixo no banco.
 *
 * <p>{@code @Transactional} na classe da rollback por teste, entao as contas
 * criadas nao vazam para os testes seguintes.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AutenticacaoTest {

    private static final String SENHA = "senha1234";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private TokenJwtService tokens;

    @Autowired
    private ObjectMapper json;

    /** Mesmo segredo de src/test/resources/application.yml. */
    @Value("${plataforma.jwt.chave}")
    private String segredo;

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

    /** Cadastra a conta pela API publica da HU01. */
    private long criarConta(String email) throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoCadastro(email)))
                .andExpect(status().isCreated());

        return usuarios.findByEmail(email).orElseThrow().getId();
    }

    private String corpoLogin(String email, String senha) {
        return """
                { "email": "%s", "senha": "%s" }
                """.formatted(email, senha);
    }

    /** Faz login e devolve o token emitido. */
    private String tokenDe(String email, String senha) throws Exception {
        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin(email, senha)))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> corpo = json.readValue(resultado.getResponse().getContentAsString(), Map.class);
        return corpo.get("token").toString();
    }

    private SecretKey chave() {
        return Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));
    }

    /** Token valido em forma, expirado ha uma hora. */
    private String tokenExpirado() {
        Instant agora = Instant.now();
        return Jwts.builder()
                .issuer("plataforma-de-estudos")
                .subject("1")
                .issuedAt(Date.from(agora.minusSeconds(7200)))
                .expiration(Date.from(agora.minusSeconds(3600)))
                .signWith(chave(), Jwts.SIG.HS256)
                .compact();
    }

    // -----------------------------------------------------------------------
    // 1. Login com credenciais validas
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("login com credenciais validas devolve o token e os dados do usuario")
    void autenticaCredenciaisValidas() throws Exception {
        criarConta("login.valido@email.com");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("login.valido@email.com", SENHA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tipo").value("Bearer"))
                .andExpect(jsonPath("$.expiraEmMinutos").isNumber())
                .andExpect(jsonPath("$.email").value("login.valido@email.com"))
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.perfil").value("ALUNO"));
    }

    // -----------------------------------------------------------------------
    // 2. Login com e-mail inexistente
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("login com e-mail inexistente responde 401")
    void rejeitaEmailInexistente() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("ninguem@email.com", SENHA)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("credenciais"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("E-mail ou senha invalidos."));
    }

    // -----------------------------------------------------------------------
    // 3. Login com senha incorreta
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("login com senha incorreta responde 401")
    void rejeitaSenhaIncorreta() throws Exception {
        criarConta("login.senha.errada@email.com");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("login.senha.errada@email.com", "senhavariada9")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("credenciais"));
    }

    /**
     * E-mail inexistente e senha errada precisam ser indistinguiveis. Se as
     * respostas fossem diferentes, a API permitiria descobrir quais e-mails tem
     * conta na plataforma - e a partir dai escolher alvos para forca bruta.
     */
    @Test
    @DisplayName("e-mail inexistente e senha incorreta devolvem exatamente a mesma resposta")
    void naoRevelaQualDosDoisFalhou() throws Exception {
        criarConta("login.indistinguivel@email.com");

        String comEmailInexistente = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("ninguem@email.com", SENHA)))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        String comSenhaErrada = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("login.indistinguivel@email.com", "senhavariada9")))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(comSenhaErrada).isEqualTo(comEmailInexistente);
    }

    // -----------------------------------------------------------------------
    // 4. Validacao dos campos obrigatorios
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("login sem e-mail ou sem senha responde 400 com o erro em cada campo")
    void validaCamposObrigatorios() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("", "")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[?(@.campo == 'email')].mensagem")
                        .value("O e-mail e obrigatorio."))
                .andExpect(jsonPath("$.erros[?(@.campo == 'senha')].mensagem")
                        .value("A senha e obrigatoria."));
    }

    @Test
    @DisplayName("login com e-mail invalido e recusado com erro no campo email")
    void validaFormatoDoEmail() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("nao-e-um-email", SENHA)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("email"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Informe um e-mail valido."));
    }

    // -----------------------------------------------------------------------
    // 5. Geracao de autenticacao valida
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("o token emitido carrega o id e o perfil do usuario e expoe a validade configurada")
    void geraTokenComIdentificacaoEValidade() throws Exception {
        long idEsperado = criarConta("token.conteudo@email.com");

        String token = tokenDe("token.conteudo@email.com", SENHA);

        // O token e aceito pela propria rotina de validacao e devolve o id.
        assertThat(tokens.extrairUsuarioId(token)).isEqualTo(idEsperado);
        assertThat(tokens.extrairPerfil(token)).isEqualTo("ALUNO");

        var claims = Jwts.parser()
                .verifyWith(chave())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        assertThat(claims.getIssuer()).isEqualTo("plataforma-de-estudos");
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    @Test
    @DisplayName("o token traz o id e o perfil, mas nunca nome nem e-mail")
    void tokenNaoCarregaDadosPessoais() throws Exception {
        criarConta("token.sem.pii@email.com");

        String token = tokenDe("token.sem.pii@email.com", SENHA);
        String conteudo = new String(java.util.Base64.getUrlDecoder().decode(token.split("\\.")[1]));

        assertThat(conteudo)
                .doesNotContain("token.sem.pii@email.com")
                .doesNotContain("Ana Souza");
    }

    /** A senha nunca pode aparecer na resposta - nem em claro, nem o hash. */
    @Test
    @DisplayName("a resposta do login nao expoe senha nem hash")
    void naoExpoeSenhaNemHashNaResposta() throws Exception {
        criarConta("login.sigilo@email.com");

        String resposta = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoLogin("login.sigilo@email.com", SENHA)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(resposta)
                .doesNotContain("senha1234")
                .doesNotContain("pbkdf2-sha256");
    }

    // -----------------------------------------------------------------------
    // 6. Acesso a recurso protegido com autenticacao valida
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("recurso protegido responde 200 com o token no cabecalho Authorization")
    void acessaRecursoProtegidoComTokenValido() throws Exception {
        criarConta("protegido.ok@email.com");
        String token = tokenDe("protegido.ok@email.com", SENHA);

        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("protegido.ok@email.com"))
                .andExpect(jsonPath("$.nome").value("Ana Souza"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.perfil").value("ALUNO"));
    }

    /**
     * O e-mail e normalizado igual ao cadastro. Sem isso, digitar maiusculas
     * quebraria o login de quem fez a conta.
     *
     * <p>Espaco nas pontas e outra historia: o {@code @Email} recusa, e o
     * frontend ja envia o e-mail sem espaco. O que este teste cobre e o caso
     * que realmente chega na API.
     */
    @Test
    @DisplayName("o login aceita e-mail com maiusculas")
    void autenticaEmailNormalizado() throws Exception {
        long idEsperado = criarConta("normalizado@email.com");

        String token = tokenDe("Normalizado@Email.COM", SENHA);

        assertThat(tokens.extrairUsuarioId(token)).isEqualTo(idEsperado);
    }

    // -----------------------------------------------------------------------
    // 7. Tentativa de acesso sem autenticacao
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("recurso protegido sem token responde 401 em JSON")
    void bloqueiaAcessoSemToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("autenticacao"))
                .andExpect(jsonPath("$.erros[0].mensagem").value("Faca login para acessar este recurso."));
    }

    @Test
    @DisplayName("recurso protegido com token invalido responde 401")
    void bloqueiaTokenInvalido() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer nao.e.um.jwt"))
                .andExpect(status().isUnauthorized());

        // Sem o prefixo "Bearer" o token nem e considerado.
        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "so.o.token.sem.prefixo"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("token expirado responde 401")
    void bloqueiaTokenExpirado() throws Exception {
        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenExpirado()))
                .andExpect(status().isUnauthorized());
    }

    /**
     * Token assinado com a chave errada tem de ser recusado: e o que impede que
     * o token de um ambiente vazue para o outro.
     */
    @Test
    @DisplayName("token assinado com outra chave responde 401")
    void bloqueiaTokenDeOutraAssinatura() throws Exception {
        SecretKey outraChave = Keys.hmacShaKeyFor(
                "outro-segredo-de-teste-com-tamanho-suficiente-para-hs256".getBytes(StandardCharsets.UTF_8));

        String token = Jwts.builder()
                .issuer("plataforma-de-estudos")
                .subject("1")
                .issuedAt(new Date())
                .expiration(Date.from(Instant.now().plusSeconds(3600)))
                .signWith(outraChave, Jwts.SIG.HS256)
                .compact();

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    /**
     * A HU01 nao pode ter quebrado ao entrar o Spring Security: cadastro
     * continua publico, sem token.
     */
    @Test
    @DisplayName("o cadastro da HU01 continua publico, sem token")
    void cadastroContinuaPublico() throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoCadastro("cadastro.ainda.publico@email.com")))
                .andExpect(status().isCreated());
    }
}