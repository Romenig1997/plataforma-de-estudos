package br.com.romenig.plataforma.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.ContasDeTeste;
import tools.jackson.databind.ObjectMapper;

/**
 * Criterios de aceite da HU04 - Perfis de Acesso Diferenciados.
 *
 * <p>O banco identifica ADMIN/ALUNO (criterio 1): toda identidade nova do
 * Supabase Auth vira ALUNO, e a promocao a ADMIN e feita pela area admin ou
 * direto no banco. O papel e lido do banco a cada requisicao: um claim
 * forjado no token nao concede acesso administrativo.
 *
 * <p>Criterios 2 e 3: ADMIN acessa a area restrita ({@code /api/admin/**}) e
 * ALUNO recebe 403 com o campo {@code autorizacao}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PerfilDeAcessoTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ObjectMapper json;

    @PersistenceContext
    private EntityManager entidades;

    private final Map<String, String> tokens = new HashMap<>();

    // -----------------------------------------------------------------------
    // Auxiliares
    // -----------------------------------------------------------------------

    /**
     * Primeiro acesso de uma identidade nova do Supabase Auth: o perfil e
     * criado pelo backend (no Supabase, pelo gatilho do cadastro).
     */
    private void criarConta(String email) throws Exception {
        String token = ContasDeTeste.token(UUID.randomUUID(), email, "Ana Souza");
        tokens.put(email, token);
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
    }

    /** Promove (ou rebaixa) uma conta direto no banco - a operacao manual da HU. */
    private void definirPerfil(String email, String perfil) {
        entidades.flush();
        jdbc.update("UPDATE usuario SET perfil_id = (SELECT id FROM perfil WHERE nome = ?) WHERE email = ?",
                perfil, email);
        entidades.clear();
    }

    private long criarAdminNoBanco(String email) {
        tokens.put(email, ContasDeTeste.criar(jdbc, "Ana Souza", email, "ADMIN"));
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private String tokenDe(String email) {
        return tokens.get(email);
    }

    // -----------------------------------------------------------------------
    // 1. O banco identifica o perfil
    // -----------------------------------------------------------------------
    @Test
    @DisplayName("conta nova nasce ALUNO e o /me expoe o perfil")
    void contaNovaNasceAluno() throws Exception {
        criarConta("perfil.cadastro@email.com");

        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("perfil.cadastro@email.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ALUNO"));
        assertThat(jdbc.queryForObject("""
                SELECT p.nome FROM usuario u JOIN perfil p ON p.id = u.perfil_id WHERE u.email = ?
                """, String.class, "perfil.cadastro@email.com")).isEqualTo("ALUNO");
    }

    @Test
    @DisplayName("promover a ADMIN no banco vale na proxima requisicao, sem novo login")
    void promocaoNoBancoValeImediatamente() throws Exception {
        criarConta("perfil.promovido@email.com");
        definirPerfil("perfil.promovido@email.com", "ADMIN");

        String token = tokenDe("perfil.promovido@email.com");
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ADMIN"));
        mockMvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk());
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

        mockMvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("aluno.bloqueado@email.com")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.erros[0].campo").value("autorizacao"))
                .andExpect(jsonPath("$.erros[0].mensagem")
                        .value("Voce nao tem permissao para acessar este recurso."));
    }

    @Test
    @DisplayName("claim de papel forjado no token nao concede acesso de ADMIN")
    void claimForjadoNaoViraAdmin() throws Exception {
        UUID id = UUID.randomUUID();
        String forjado = ContasDeTeste.construtor(id, "aluno.forjado@email.com", "Aluno")
                .claim("perfil", "ADMIN")
                .claim("app_metadata", Map.of("role", "ADMIN"))
                .compact();

        mockMvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + forjado))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN acessa a lista de usuarios apenas com campos de gestao")
    void adminAcessaListaDeUsuarios() throws Exception {
        criarConta("aluno.na.lista@email.com");
        criarAdminNoBanco("admin.na.lista@email.com");

        MvcResult resultado = mockMvc.perform(get("/api/admin/usuarios")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("admin.na.lista@email.com")))
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
        assertThat(aluno.keySet()).containsExactlyInAnyOrder("id", "nome", "email", "perfil", "emailVerificado", "criadoEm");
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

    // -----------------------------------------------------------------------
    // Painel admin: resumo e troca de perfil
    // -----------------------------------------------------------------------
    private long idDe(String email) {
        entidades.flush();
        return jdbc.queryForObject("SELECT id FROM usuario WHERE email = ?", Long.class, email);
    }

    private String corpoPerfil(String perfil) {
        return "{ \"perfil\": \"%s\" }".formatted(perfil);
    }

    @Test
    @DisplayName("ADMIN ve o resumo com as contagens da plataforma")
    void adminVeResumo() throws Exception {
        criarConta("aluno.resumo@email.com");
        criarAdminNoBanco("admin.resumo@email.com");

        mockMvc.perform(get("/api/admin/resumo").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("admin.resumo@email.com")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAlunos").isNumber())
                .andExpect(jsonPath("$.totalAdministradores").isNumber())
                .andExpect(jsonPath("$.contasSemConfirmacao").isNumber())
                .andExpect(jsonPath("$.cursosPublicados").isNumber())
                .andExpect(jsonPath("$.questoesEmRascunho").isNumber())
                .andExpect(jsonPath("$.cursos").isArray())
                // O primeiro acesso grava a data: o aluno conta como novo e aparece entre os recentes.
                .andExpect(jsonPath("$.novosAlunos30Dias").value(org.hamcrest.Matchers.greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.cadastrosRecentes[?(@.nome == 'Ana Souza' && @.perfil == 'ALUNO')]").exists())
                .andExpect(jsonPath("$.cadastrosRecentes[0].criadoEm").isNotEmpty());
    }

    @Test
    @DisplayName("ALUNO recebe 403 no resumo e na troca de perfil")
    void alunoNaoUsaOPainel() throws Exception {
        criarConta("aluno.painel@email.com");
        String token = tokenDe("aluno.painel@email.com");
        long id = idDe("aluno.painel@email.com");

        mockMvc.perform(get("/api/admin/resumo").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/admin/usuarios/" + id + "/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("ADMIN")))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN promove um aluno, que passa a acessar a area admin com a mesma sessao")
    void adminPromoveAluno() throws Exception {
        criarConta("aluno.promovivel@email.com");
        String tokenDoAluno = tokenDe("aluno.promovivel@email.com");
        criarAdminNoBanco("admin.promove@email.com");
        long id = idDe("aluno.promovivel@email.com");

        mockMvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDoAluno))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/admin/usuarios/" + id + "/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("admin.promove@email.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perfil").value("ADMIN"));

        entidades.flush();
        entidades.clear();

        mockMvc.perform(get("/api/admin/usuarios").header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDoAluno))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("ADMIN nao altera o proprio perfil")
    void adminNaoAlteraOProprioPerfil() throws Exception {
        long id = criarAdminNoBanco("admin.proprio@email.com");

        mockMvc.perform(put("/api/admin/usuarios/" + id + "/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("admin.proprio@email.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("ALUNO")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("perfil"));
    }

    @Test
    @DisplayName("perfil desconhecido e recusado")
    void perfilDesconhecidoERecusado() throws Exception {
        criarConta("aluno.perfil.invalido@email.com");
        criarAdminNoBanco("admin.perfil.invalido@email.com");
        long id = idDe("aluno.perfil.invalido@email.com");

        mockMvc.perform(put("/api/admin/usuarios/" + id + "/perfil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenDe("admin.perfil.invalido@email.com"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(corpoPerfil("SUPER")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.erros[0].campo").value("perfil"));
    }
}
