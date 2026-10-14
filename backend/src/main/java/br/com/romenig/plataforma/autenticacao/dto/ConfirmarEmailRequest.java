package br.com.romenig.plataforma.autenticacao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ConfirmarEmailRequest(
        @NotBlank(message = "O link de confirmação é obrigatório.")
        @Size(max = 255, message = "O link de confirmação é inválido.")
        String token) { }
