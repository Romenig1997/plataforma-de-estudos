package br.com.romenig.plataforma.autenticacao;

import java.util.UUID;

/**
 * Identidade lida de um access token valido do Supabase Auth.
 *
 * @param id    o {@code sub} do token, que e o {@code auth.users.id}
 * @param email e-mail da conta no Supabase Auth
 * @param nome  nome informado no cadastro ({@code user_metadata.nome}); pode ser nulo
 */
public record IdentidadeSupabase(UUID id, String email, String nome) {
}
