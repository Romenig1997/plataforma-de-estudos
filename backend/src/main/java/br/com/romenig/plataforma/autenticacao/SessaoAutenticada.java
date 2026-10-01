package br.com.romenig.plataforma.autenticacao;

/**
 * Identidade carregada em uma requisicao ja autenticada.
 *
 * <p>Guarda apenas o {@code id} do usuario, que e o unico dado gravado no
 * token. O nome e o e-mail sao lidos do banco quando a tela autenticada
 * precisa deles ({@code GET /api/auth/me}), o que mantem o JWT pequeno e sem
 * dados pessoais trafegando no cabecalho.
 *
 * <p>Esta classe e o principal (principal) devolvido ao
 * {@code SecurityContext} pelo {@link FiltroDeTokenJwt}.
 */
public record SessaoAutenticada(Long id) {
}