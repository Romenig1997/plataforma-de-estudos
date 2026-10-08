package br.com.romenig.plataforma.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;

import javax.crypto.SecretKey;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.usuario.CodificadorDeSenha;

import tools.jackson.databind.ObjectMapper;

/**
 * Criterios de aceite da HU04 - Perfis de Acesso Diferenciados.
 *
 * <p>O banco identifica ADMIN/ALUNO (criterio 1): o cadastro publico da HU01
 * grava sempre ALUNO, e a promocao a ADMIN e feita direto no banco - e o que
 * este teste simula com um {@code INSERT} cru via {@code JdbcTemplate},
 * porque e exatamente a operacao manual que a promocao exige em producao.
 *
 * <p>Critérios 2 e 3: ADMIN acessa a area restrita ({@code /api/admin/**}) e
 * ALUNO recebe 403 com o campo {@code autorizacao} - resposta JSON do
 * {@code ErroDeAutenticacaoHandler}.
 *
 * <p>Mesmo esqueleto dos demais testes: H2 em memoria com o schema.sql do
 * Supabase, end-to-end pela camada HTTP, {@code @Transactional} para rollback
 * por teste.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PerfilDeAcessoTest {

    private static final String SENHA = "senha1234";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private CodificadorDeSenha codificador;

    @Autowired
    private ObjectMapper json;

    @PersistenceContext
    private EntityManager entidades;

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

    /** Cadastra a conta pela API publica da HU01 (o unico caminho real). */
    private void criarConta(String email) throws Exception {
        mockMvc.perform(post("/api/usuarios")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoCadastro(email)))
                .andExpect(status().isCreated());
    }

    /** Promove (ou rebaixa) uma conta direto no banco - a operacao manual da HU. */
    private void definirPerfil(String email, String perfil) {
        // Forca o INSERT do cadastro a descer para o banco antes do UPDATE cru,
        // e depois descarta o contexto do JPA: em producao a promocao ocorre
        // fora de qualquer transacao de leitura, entao a proxima requisicao
        // relê o perfil atualizado. Flush+clear simula esse limite.
        entidades.flush();
        jdbc.update("UPDATE usuario SET perfil = ? WHERE email = ?", perfil, email);
        entidades.clear();
    }

    /**
     * Cria uma conta ADMIN direto no banco, como se fosse promovida por
     * operacao manual: hash PBKDF2 real, perfil ADMIN. Evita depender do
     * cache do JPA (que não veria o UPDATE cru dentro da mesma transacao).
     */
    private long criarAdminNoBanco(String email) {
        String hash = codificador.codificar(SENHA);
        jdbc.update("""
                INSERT INTO usuario (nome, email, senha_hash, perfil)
                VALUES ('Ana Souza', ?, ?, 'ADMIN')
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

    /** Token valido em forma, sem o claim de perfil da HU04 (emitido antes dela). */
    private String tokenSemPerfil() {
        Instant agora = Instant.now();
        SecretKey chave = Keys.hmacShaKeyFor(segredo.getBytes(StandardCharsets.UTF_8));

        return Jwts.builder()
                .issuer("plataforma-de-estudos")
                .subject("1")
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusSeconds(3600)))
                .signWith(chave, Jwts.SIG.HS256)
                .compact();
    }

    // -----------------------------------------------------------------------
    // 1. O banco identifica o perfil
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("cadastro grava ALUNO e login/me expoem o perfil")
    void cadastroCriaAlunoELoginElesExpoemOPerfil() throws Exception {
        criarConta("perfil.cadastro@email.com");
        String token = tokenDe("perfil.cadastro@email.com");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "email": "perfil.cadastro@email.com", "senha": "%s" }
                                """.formatted(SENHA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ALUNO"));

        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ALUNO"));
    }

    @Test
    @DisplayName("promover a ADMIN no banco reflete no login e no /me")
    void promocaoNoBancoApareceNoLoginENoMe() throws Exception {
        criarConta("perfil.promovido@email.com");
        definirPerfil("perfil.promovido@email.com", "ADMIN");

        String token = tokenDe("perfil.promovido@email.com");

        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ADMIN"));
    }

    // -----------------------------------------------------------------------
    // 2 e 3. Area admin: ADMIN entra, ALUNO e bloqueado
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("area admin sem token responde 401 com o campo autenticacao")
    void bloqueiaAreaAdminSemToken() throws Exception {
        mockMvc.perform(get("/api/admin/usuarios"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.erros[0].campo").value("autenticacao"));
    }

    @Test
    @DisplayName("ALUNO recebe 403 com o campo autorizacao na area admin")
    void alunoRecebe403NaAreaAdmin() throws Exception {
        criarConta("aluno.bloqueado@email.com");
        String token = tokenDe("aluno.bloqueado@email.com");

        mockMvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erros[0].campo").value("autorizacao"))
                .andExpect(jsonPath("$.erros[0].mensagem")
                        .value("Voce nao tem permissao para acessar este recurso."));
    }

    @Test
    @DisplayName("token emitido antes da HU04 vale como ALUNO e e bloqueado na area admin")
    void tokenAntigoSemClaimValeComoAluno() throws Exception {
        criarAdminNoBanco("admin.token.antigo@email.com");

        mockMvc.perform(get("/api/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenSemPerfil()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erros[0].campo").value("autorizacao"));
    }

    @Test
    @DisplayName("ADMIN promovido no banco acessa a lista de usuarios com perfil e sem hash")
    void adminAcessaListaDeUsuarios() throws Exception {
        criarConta("aluno.na.lista@email.com");
        criarAdminNoBanco("admin.na.lista@email.com");
        String token = tokenDe("admin.na.lista@email.com");

        MvcResult resultado = mockMvc.perform(get("/api/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andReturn();

        List<Map<String, Object>> lista = json.readValue(
                resultado.getResponse().getContentAsString(), List.class);

        Map<String, Object> aluno = lista.stream()
                .filter(item -> "aluno.na.lista@email.com".equals(item.get("email")))
                .findFirst().orElseThrow();
        Map<String, Object> admin = lista.stream()
                .filter(item -> "admin.na.lista@email.com".equals(item.get("email")))
                .findFirst().orElseThrow();

        assertThat(aluno.get("perfil")).isEqualTo("ALUNO");
        assertThat(admin.get("perfil")).isEqualTo("ADMIN");
        assertThat(admin.get("nome")).isEqualTo("Ana Souza");
        assertThat(aluno.keySet()).containsExactlyInAnyOrder("id", "nome", "email", "perfil");
    }

    @Test
    @DisplayName("a lista da area admin nao expoe senha nem hash")
    void listaDaAreaAdminNaoExpoeSenhaNemHash() throws Exception {
        criarAdminNoBanco("admin.sigilo@email.com");
        String token = tokenDe("admin.sigilo@email.com");

        String resposta = mockMvc.perform(get("/api/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertThat(resposta)
                .doesNotContain("senha1234")
                .doesNotContain("senhaHash")
                .doesNotContain("senha_hash");
    }

    // -----------------------------------------------------------------------
    // Rotas do aluno continuam liberadas para ALUNO e ADMIN
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("perfil e /me continuam acessiveis para ALUNO e ADMIN")
    void perfilEMeContinuamLiberadosParaAmbos() throws Exception {
        criarConta("perfil.ambos@email.com");
        String tokenAluno = tokenDe("perfil.ambos@email.com");

        mockMvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenAluno))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenAluno))
                .andExpect(status().isOk());

        criarAdminNoBanco("perfil.admin@email.com");
        String tokenAdmin = tokenDe("perfil.admin@email.com");

        mockMvc.perform(get("/api/perfil").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenAdmin))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenAdmin))
                .andExpect(status().isOk());
    }
}