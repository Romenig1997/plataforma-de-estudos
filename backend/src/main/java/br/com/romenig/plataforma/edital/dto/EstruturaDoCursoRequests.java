package br.com.romenig.plataforma.edital.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Corpos da edicao da estrutura de um curso publicado pelo admin.
 *
 * <p>{@code pagina} e opcional: sem ela, o item herda a pagina do PDF do
 * assunto ou da disciplina em que entra.
 */
public final class EstruturaDoCursoRequests {

    private EstruturaDoCursoRequests() {
    }

    /** Disciplina nova ja nasce com o primeiro assunto: o cronograma exige ao menos um topico. */
    public record NovaDisciplina(
            @NotBlank(message = "Informe o nome da disciplina.") @Size(max = 255, message = "Use até 255 caracteres no nome da disciplina.") String nome,
            @NotBlank(message = "Informe o primeiro assunto da disciplina.") @Size(max = 500, message = "Use até 500 caracteres no nome do assunto.") String primeiroAssunto,
            @Min(value = 1, message = "A página deve ser 1 ou maior.") @Max(value = 9999, message = "A página deve ser até 9999.") Integer pagina) {
    }

    /** Assunto (sem {@code paiId}) ou subassunto (com o id do assunto). */
    public record NovoConteudo(
            @NotBlank(message = "Informe o nome do tópico.") @Size(max = 500, message = "Use até 500 caracteres no nome do tópico.") String nome,
            Long paiId,
            @Min(value = 1, message = "A página deve ser 1 ou maior.") @Max(value = 9999, message = "A página deve ser até 9999.") Integer pagina) {
    }

    public record NovoNome(
            @NotBlank(message = "Informe o novo nome.") @Size(max = 500, message = "Use até 500 caracteres no nome.") String nome) {
    }
}
