package br.com.romenig.plataforma.autenticacao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequest(
        @NotBlank(message = "O link de redefinição é obrigatório.")
        @Size(max = 255, message = "O link de redefinição é inválido.")
        String token,
        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 8, max = 255, message = "A senha deve ter entre 8 e 255 caracteres.")
        String novaSenha) { }
