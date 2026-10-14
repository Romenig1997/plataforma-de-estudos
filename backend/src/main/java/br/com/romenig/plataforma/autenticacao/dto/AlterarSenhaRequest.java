package br.com.romenig.plataforma.autenticacao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AlterarSenhaRequest(
        @NotBlank(message = "Informe sua senha atual.")
        @Size(max = 255, message = "A senha atual é inválida.")
        String senhaAtual,
        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, max = 255, message = "A senha deve ter entre 8 e 255 caracteres.")
        String novaSenha) { }
