package br.com.romenig.plataforma.usuario.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Dados de entrada do cadastro.
 *
 * As validacoes ficam aqui para que o contrato da API seja autodescritivo e
 * o frontend possa receber mensagens campo a campo.
 */
public record CadastroUsuarioRequest(

        @NotBlank(message = "O nome e obrigatorio.")
        @Size(max = 120, message = "O nome deve ter no maximo 120 caracteres.")
        String nome,

        @NotBlank(message = "O e-mail e obrigatorio.")
        @Email(message = "Informe um e-mail valido.")
        @Size(max = 180, message = "O e-mail deve ter no maximo 180 caracteres.")
        String email,

        @NotBlank(message = "A senha e obrigatoria.")
        @Size(min = 8, message = "A senha deve ter no minimo 8 caracteres.")
        String senha) {
}