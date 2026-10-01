package br.com.romenig.plataforma.autenticacao.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Credenciais de entrada do login.
 *
 * <p>As validacoes seguem o mesmo padrao do cadastro (HU01): o contrato da
 * API e autodescritivo e o frontend recebe a mensagem campo a campo.
 *
 * <p>A senha nao tem regra de tamanho aqui de proposito: aceitar qualquer
 * tamanho aqui evita revelar a regra de senha do cadastro por um caminho
 * paralelo. Quem cadastrou ja passou pela validacao da HU01.
 */
public record LoginRequest(

        @NotBlank(message = "O e-mail e obrigatorio.")
        @Email(message = "Informe um e-mail valido.")
        @Size(max = 180, message = "O e-mail deve ter no maximo 180 caracteres.")
        String email,

        @NotBlank(message = "A senha e obrigatoria.")
        @Size(max = 255, message = "A senha deve ter no maximo 255 caracteres.")
        String senha) {
}