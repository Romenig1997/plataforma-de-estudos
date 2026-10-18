package br.com.romenig.plataforma.admin.dto;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Indicadores da visao geral da area admin. Alem das contagens, so o nome,
 * o perfil e a data dos cadastros mais recentes: nada de e-mail nem senha.
 */
public record ResumoAdminResponse(
        long totalAlunos,
        long totalAdministradores,
        long novosAlunos30Dias,
        long contasSemConfirmacao,
        long cursosPublicados,
        long editaisAguardandoRevisao,
        long questoesPublicadas,
        long questoesEmRascunho,
        List<Curso> cursos,
        List<CadastroRecente> cadastrosRecentes) {

    /** Numeros de um curso publicado (edital aprovado). */
    public record Curso(
            Long editalId,
            String titulo,
            String sigla,
            long inscritos,
            long questoesPublicadas,
            long questoesEmRascunho) {
    }

    public record CadastroRecente(Long id, String nome, String perfil, OffsetDateTime criadoEm) {
    }
}
