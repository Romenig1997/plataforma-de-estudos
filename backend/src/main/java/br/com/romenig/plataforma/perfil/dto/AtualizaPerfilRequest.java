package br.com.romenig.plataforma.perfil.dto;

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
 * <p>E-mail e senha nao aparecem aqui: sao do Supabase Auth.
 */
public record AtualizaPerfilRequest(

        @NotBlank(message = "O nome é obrigatório.")
        @Size(max = 120, message = "O nome deve ter no máximo 120 caracteres.")
        String nome,

        @Min(value = 1, message = "A meta semanal deve ser de no mínimo 1 hora.")
        @Max(value = 168, message = "A meta semanal deve ter no máximo 168 horas.")
        Integer metaEstudoSemanal,

        @Size(max = 500, message = "O objetivo deve ter no máximo 500 caracteres.")
        String objetivoMotivacao) {
}
