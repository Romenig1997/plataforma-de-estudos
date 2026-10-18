package br.com.romenig.plataforma.autenticacao;

/**
 * Identidade carregada em uma requisicao ja autenticada.
 *
 * <p>Guarda apenas o {@code id} interno do usuario (tabela {@code usuario}).
 * E o principal publicado pelo {@link FiltroDeTokenSupabase} depois de
 * conferir o access token do Supabase Auth e localizar o perfil; o papel vira
 * a authority da autenticacao e o token original fica nas credenciais.
 */
public record SessaoAutenticada(Long id) {
}
