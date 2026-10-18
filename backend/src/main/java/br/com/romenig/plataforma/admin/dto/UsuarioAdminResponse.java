package br.com.romenig.plataforma.admin.dto;

import java.time.OffsetDateTime;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Linha da listagem da area admin (HU04).
 *
 * <p>Montada explicitamente para que o {@code senha_hash} da entidade nunca
 * possa vazar por serializacao. {@code perfil} e o valor que o banco guarda
 * (ADMIN ou ALUNO); {@code emailVerificado} diz se a conta ja confirmou o
 * e-mail; {@code criadoEm} e nulo nas contas anteriores a V16.
 */
public record UsuarioAdminResponse(
        Long id,
        String nome,
        String email,
        String perfil,
        boolean emailVerificado,
        OffsetDateTime criadoEm) {

    public static UsuarioAdminResponse de(Usuario usuario) {
        return new UsuarioAdminResponse(
                usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPerfil(),
                usuario.isEmailVerificado(), usuario.getCriadoEm());
    }
}
