package br.com.romenig.plataforma.usuario.dto;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Dados devolvidos no cadastro bem-sucedido.
 *
 * Por decisao de projeto o hash da senha NUNCA aparece na resposta: um
 * eco acidental nao pode expor a credencial.
 */
public record CadastroUsuarioResponse(Long id, String nome, String email) {

    public static CadastroUsuarioResponse de(Usuario usuario) {
        return new CadastroUsuarioResponse(usuario.getId(), usuario.getNome(), usuario.getEmail());
    }
}