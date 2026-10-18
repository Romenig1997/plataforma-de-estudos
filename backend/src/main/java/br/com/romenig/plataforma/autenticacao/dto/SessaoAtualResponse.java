package br.com.romenig.plataforma.autenticacao.dto;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Dados do usuario da sessao atual, devolvidos por {@code GET /api/auth/me}.
 *
 * <p>O {@code perfil} (HU04) e o valor atual no banco: e ele que decide se o
 * frontend abre a area administrativa ou a area do aluno.
 */
public record SessaoAtualResponse(
        Long id,
        String nome,
        String email,
        String perfil,
        String avatarUrl) {

    public static SessaoAtualResponse de(Usuario usuario) {
        return new SessaoAtualResponse(usuario.getId(), usuario.getNome(), usuario.getEmail(),
                usuario.getPerfil(), usuario.getAvatarUrl());
    }
}
