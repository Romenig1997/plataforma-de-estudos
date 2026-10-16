package br.com.romenig.plataforma.edital.dto;

import java.time.OffsetDateTime;

import br.com.romenig.plataforma.edital.ImportacaoEdital;

/**
 * Importacao de edital como a API a entrega (HU07, incremento A).
 *
 * <p>O texto extraido pela IA viaja como JSON em {@code conteudoEmJson} - o
 * frontend o deserializa e exibe para revisao - e os erros da validacao manual
 * em {@code errosEmJson}. Ambos sao {@code null} (ou vazios) para importacoes
 * em {@code FALHA}, quando ainda nao ha o que revisar.
 */
public record ImportacaoDeEditalResponse(
        Long id,
        String status,
        Integer totalPaginas,
        String conteudoEmJson,
        String errosEmJson,
        String nomeArquivo,
        String sha256,
        OffsetDateTime criadoEm,
        OffsetDateTime atualizadoEm,
        Long editalAprovadoId) {

    public static ImportacaoDeEditalResponse de(ImportacaoEdital importacao) {
        // So o id: o curso aprovado continua carregado sob demanda.
        Long editalAprovadoId = importacao.getEditalAprovado() == null
                ? null
                : importacao.getEditalAprovado().getId();
        return new ImportacaoDeEditalResponse(
                importacao.getId(),
                importacao.getStatus().name(),
                importacao.getTotalPaginas(),
                importacao.getConteudoExtraido(),
                importacao.getErrosValidacao(),
                importacao.getPdf().getNomeOriginal(),
                importacao.getPdf().getSha256(),
                importacao.getCriadoEm(),
                importacao.getAtualizadoEm(),
                editalAprovadoId);
    }
}