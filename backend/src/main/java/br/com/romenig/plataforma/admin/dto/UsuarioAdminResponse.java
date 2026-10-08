package br.com.romenig.plataforma.admin.dto;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Linha da listagem da area admin (HU04).
 *
 * <p>Montada explicitamente para que o {@code senha_hash} da entidade nunca
 * possa vazar por serializacao. {@code perfil} e o valor que o banco guarda
 * (ADMIN ou ALUNO).
 */
public record UsuarioAdminResponse(
        Long id,
        String nome,
        String email,
        String perfil) {

    public static UsuarioAdminResponse de(Usuario usuario) {
        return new UsuarioAdminResponse(
                usuario.getId(), usuario.getNome(), usuario.getEmail(), usuario.getPerfil());
    }
}