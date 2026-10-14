package br.com.romenig.plataforma.perfil.dto;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Dados devolvidos por {@code GET /api/perfil} e por {@code PUT /api/perfil}.
 *
 * <p>Montada explicitamente a partir da entidade, do mesmo jeito que
 * {@code SessaoAtualResponse} e {@code CadastroUsuarioResponse}, para que o
 * {@code senha_hash} nunca possa vazar por serializacao.
 *
 * <p>Os campos opcionais voltam como {@code null} quando a pessoa ainda nao
 * os preencheu - a API nao inventa valor padrao.
 */
public record PerfilResponse(
        Long id,
        String nome,
        String email,
        Integer metaEstudoSemanal,
        String objetivoMotivacao,
        boolean temFoto) {

    public static PerfilResponse de(Usuario usuario, boolean temFoto) {
        return new PerfilResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getMetaEstudoSemanal(),
                usuario.getObjetivoMotivacao(), temFoto);
    }
}
