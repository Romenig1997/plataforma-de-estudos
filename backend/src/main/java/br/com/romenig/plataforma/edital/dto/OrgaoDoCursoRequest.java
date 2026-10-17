package br.com.romenig.plataforma.edital.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import br.com.romenig.plataforma.edital.SiglaDoOrgao;

/** Edicao do admin do nome e da sigla do orgao exibidos no card do curso. */
public record OrgaoDoCursoRequest(
        @NotBlank(message = "Informe o nome do órgão.") @Size(max = 120, message = "Use até 120 caracteres no nome do órgão.") String orgao,
        @NotBlank(message = "Informe a sigla do órgão.") @Size(max = SiglaDoOrgao.TAMANHO_MAXIMO, message = "Use até 20 caracteres na sigla.") String sigla) {
}
