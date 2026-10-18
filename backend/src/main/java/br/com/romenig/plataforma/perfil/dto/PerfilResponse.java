package br.com.romenig.plataforma.perfil.dto;

import java.time.OffsetDateTime;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Dados devolvidos por {@code GET /api/perfil} e por {@code PUT /api/perfil}.
 *
 * <p>Montada explicitamente a partir da entidade. {@code perfil} e o papel de
 * acesso (ADMIN ou ALUNO); {@code avatarUrl} e a URL publica da foto no
 * Supabase Storage, nula quando nao ha foto. Os campos opcionais voltam como
 * {@code null} quando a pessoa ainda nao os preencheu.
 */
public record PerfilResponse(
        Long id,
        String nome,
        String email,
        String perfil,
        String avatarUrl,
        Integer metaEstudoSemanal,
        String objetivoMotivacao,
        OffsetDateTime atualizadoEm) {

    public static PerfilResponse de(Usuario usuario) {
        return new PerfilResponse(
                usuario.getId(),
                usuario.getNome(),
                usuario.getEmail(),
                usuario.getPerfil(),
                usuario.getAvatarUrl(),
                usuario.getMetaEstudoSemanal(),
                usuario.getObjetivoMotivacao(),
                usuario.getAtualizadoEm());
    }
}
