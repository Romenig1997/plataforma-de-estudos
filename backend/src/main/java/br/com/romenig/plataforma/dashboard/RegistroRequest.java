package br.com.romenig.plataforma.dashboard;
import jakarta.validation.constraints.NotNull;
public record RegistroRequest(@NotNull Boolean concluido) {}
