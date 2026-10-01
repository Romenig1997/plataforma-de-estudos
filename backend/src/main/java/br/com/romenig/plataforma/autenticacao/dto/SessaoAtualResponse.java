package br.com.romenig.plataforma.autenticacao.dto;

/**
 * Dados do usuario da sessao atual, devolvidos por {@code GET /api/auth/me}.
 *
 * <p>E o recurso protegido minimo da HU02: sem um endpoint que exige
 * autenticacao nao ha como provar, nem por teste nem manualmente, que o token
 * emitido protege alguma coisa.
 *
 * <p>Igual ao cadastro, a resposta e montada explicitamente para que o
 * {@code senha_hash} da entidade nunca possa vazar por serializacao.
 */
public record SessaoAtualResponse(
        Long id,
        String nome,
        String email) {
}