package br.com.romenig.plataforma.questao;
import java.util.List;
import jakarta.validation.constraints.*;
public record QuestaoRequest(@NotNull Long editalId,@NotNull Long conteudoId,
 @NotBlank @Size(max=10000) String enunciado,
 @NotNull @Size(min=4,max=4) List<@NotBlank @Size(max=2000) String> alternativas,
 @NotNull @Min(0) @Max(3) Integer gabarito,@NotBlank @Size(max=10000) String explicacao) {}
