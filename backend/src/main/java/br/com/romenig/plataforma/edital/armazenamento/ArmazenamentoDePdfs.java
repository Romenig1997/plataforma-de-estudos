package br.com.romenig.plataforma.edital.armazenamento;

import java.time.Duration;

import br.com.romenig.plataforma.edital.exception.PdfIndisponivelException;

/**
 * Onde os PDFs dos editais ficam guardados.
 *
 * <p>Em producao e o bucket privado do Supabase Storage
 * ({@link ArmazenamentoDePdfsSupabase}); nos testes, uma implementacao em
 * memoria, sem rede. Todas as operacoes usam o access token de quem fez a
 * requisicao: as politicas do Storage decidem o que cada pessoa pode fazer, e
 * o backend nunca usa a chave service_role.
 *
 * <p>Todos os metodos lancam {@link PdfIndisponivelException} se o Storage
 * recusar ou nao responder, exceto {@link #remover}, que apenas registra.
 */
public interface ArmazenamentoDePdfs {

    /** Grava o PDF no caminho informado, substituindo um arquivo de mesmo caminho. */
    void enviar(String caminho, byte[] pdf, String tokenDoUsuario);

    /** Le o PDF (reprocessamento da importacao e endpoint legado). */
    byte[] baixar(String caminho, String tokenDoUsuario);

    /** URL de leitura direta no Storage, valida apenas pelo tempo informado. */
    String assinar(String caminho, Duration validade, String tokenDoUsuario);

    /** Apaga o arquivo. Falhas sao apenas registradas: sobra um arquivo orfao. */
    void remover(String caminho, String tokenDoUsuario);
}
