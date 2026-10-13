package br.com.romenig.plataforma.edital;

/**
 * Situacao de uma importacao de edital (HU07, incremento A).
 *
 * <p>O fluxo e: upload salvando o PDF e disparando a extracao
 * ({@code AGUARDANDO_EXTRACAO}), resultado da IA validado para revisao manual
 * ({@code AGUARDANDO_REVISAO}) ou com falha ({@code FALHA}), e o destino:
 * {@code APROVADO} (persistido nas tabelas de edital) ou {@code REJEITADO}
 * (descartado, mantendo o registro para auditoria).
 */
public enum StatusDeImportacao {
    AGUARDANDO_EXTRACAO,
    AGUARDANDO_REVISAO,
    FALHA,
    APROVADO,
    REJEITADO
}