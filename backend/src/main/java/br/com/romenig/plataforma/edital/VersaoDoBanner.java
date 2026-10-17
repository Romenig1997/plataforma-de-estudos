package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;

/** Versao de um banner sem a imagem: muda a URL quando o admin troca o banner. */
public record VersaoDoBanner(Long editalId, OffsetDateTime atualizadoEm) {
}
