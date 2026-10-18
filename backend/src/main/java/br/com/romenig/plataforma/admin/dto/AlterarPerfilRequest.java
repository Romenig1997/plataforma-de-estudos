package br.com.romenig.plataforma.admin.dto;

import jakarta.validation.constraints.NotBlank;

/** Corpo de {@code PUT /api/admin/usuarios/{id}/perfil}: ADMIN ou ALUNO. */
public record AlterarPerfilRequest(@NotBlank(message = "Informe o perfil de acesso.") String perfil) {
}
