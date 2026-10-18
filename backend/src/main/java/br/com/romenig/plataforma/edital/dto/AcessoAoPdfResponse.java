package br.com.romenig.plataforma.edital.dto;

import java.time.OffsetDateTime;

/**
 * Como o leitor do curso abre o PDF original.
 *
 * <ul>
 *   <li>{@code STORAGE}: {@code url} e uma URL assinada do bucket privado, que
 *       o navegador abre direto no iframe ate {@code expiraEm};</li>
 *   <li>{@code LEGADO}: PDF antigo ainda em bytea. {@code url} e {@code null}
 *       e o frontend baixa por {@code GET /api/editais/{id}/pdf}.</li>
 * </ul>
 */
public record AcessoAoPdfResponse(String origem, String url, OffsetDateTime expiraEm) {

    public static AcessoAoPdfResponse storage(String url, OffsetDateTime expiraEm) {
        return new AcessoAoPdfResponse("STORAGE", url, expiraEm);
    }

    public static AcessoAoPdfResponse legado() {
        return new AcessoAoPdfResponse("LEGADO", null, null);
    }
}
