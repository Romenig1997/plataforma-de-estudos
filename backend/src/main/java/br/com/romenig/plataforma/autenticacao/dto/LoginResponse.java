package br.com.romenig.plataforma.autenticacao.dto;

/**
 * Resposta do login bem-sucedido.
 *
 * <p>A senha nunca aparece aqui nem o hash dela - a resposta e construida
 * explicitamente, nao por serializacao da entidade.
 *
 * <p>{@code expiraEmMinutos} e a mesma configuracao de
 * {@code plataforma.jwt.expiracao-minutos}. O frontend nao precisa usá-la para
 * nada hoje: quem detecta o token vencido e o 401 do backend. Fica exposta
 * para o usuario saber ate quando a sessao vale.
 *
 * @param tipo           sempre {@code Bearer}: o esquema do cabecalho que o
 *                       frontend deve enviar nas proximas requisicoes
 * @param tipo           sempre {@code Bearer}: o esquema do cabecalho que o
 *                       frontend deve enviar nas proximas requisicoes
 * @param id, nome, email, perfil
 *                       os dados do usuario autenticado, os mesmos devolvidos
 *                       por {@code GET /api/auth/me}; o perfil (HU04) e a
 *                       copia do valor gravado no banco
 */
public record LoginResponse(
        String token,
        String tipo,
        long expiraEmMinutos,
        Long id,
        String nome,
        String email,
        String perfil) {

    public static final String TIPO_BEARER = "Bearer";
}