package br.com.romenig.plataforma.autenticacao;

/**
 * Identidade carregada em uma requisicao ja autenticada.
 *
 * <p>Guarda apenas o {@code id} do usuario, que e o dado principal do token.
 * O nome e o e-mail sao lidos do banco quando a tela autenticada precisa
 * deles ({@code GET /api/auth/me}), o que mantem o JWT sem dados pessoais.
 * O perfil (HU04) tambem vem no token, mas nao fica neste record: ele vira a
 * authority da autenticacao publicada pelo {@link FiltroDeTokenJwt}.
 *
 * <p>Esta classe e o principal (principal) devolvido ao
 * {@code SecurityContext} pelo {@link FiltroDeTokenJwt}.
 */
public record SessaoAutenticada(Long id) {
}