package br.com.romenig.plataforma.perfil.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dados de entrada da atualizacao de perfil (HU03).
 *
 * <p>{@code metaEstudoSemanal} e {@code objetivoMotivacao} sao opcionais:
 * {@code null} vale como "apagar o campo". As anotacoes {@link Min} e
 * {@link Max} ignoram {@code null}, entao a regra so cai quando ha valor.
 *
 * <p>A senha nao aparece aqui de proposito - troca de senha esta fora do
 * escopo da HU03.
 */
public record AtualizaPerfilRequest(

        @NotBlank(message = "O nome e obrigatorio.")
        @Size(max = 120, message = "O nome deve ter no maximo 120 caracteres.")
        String nome,

        @NotBlank(message = "O e-mail e obrigatorio.")
        @Email(message = "Informe um e-mail valido.")
        @Size(max = 180, message = "O e-mail deve ter no maximo 180 caracteres.")
        String email,

        @Min(value = 1, message = "A meta semanal deve ser de no minimo 1 hora.")
        @Max(value = 168, message = "A meta semanal deve ter no maximo 168 horas.")
        Integer metaEstudoSemanal,

        @Size(max = 500, message = "O objetivo deve ter no maximo 500 caracteres.")
        String objetivoMotivacao) {
}
