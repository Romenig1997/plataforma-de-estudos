package br.com.romenig.plataforma.edital.dto;

import java.util.List;

/**
 * Resultado de uma rodada de copia dos PDFs legados (bytea) para o Storage.
 *
 * @param migrados PDFs copiados e verificados nesta rodada
 * @param falhas   ids que nao puderam ser copiados (continuam legados)
 * @param restantes PDFs que ainda dependem do bytea depois da rodada
 */
public record MigracaoDePdfsResponse(int migrados, List<Long> falhas, long restantes) {
}
