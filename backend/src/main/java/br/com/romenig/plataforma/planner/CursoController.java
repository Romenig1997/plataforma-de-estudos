package br.com.romenig.plataforma.planner;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Inscricoes do aluno nos cursos (editais aprovados) e o curso em foco. */
@RestController
@RequestMapping("/api/cursos")
public class CursoController {
    public record FocoRequest(@NotNull @Positive Long editalId) { }

    private final PlannerService planner;
    public CursoController(PlannerService planner) { this.planner = planner; }

    @GetMapping("/inscricoes")
    public List<InscricaoResponse> listar() { return planner.listar(); }

    @PostMapping("/{editalId}/inscricao")
    public PlanoResponse inscrever(@PathVariable Long editalId) { return planner.inscrever(editalId); }

    @DeleteMapping("/{editalId}/inscricao")
    public ResponseEntity<Void> cancelar(@PathVariable Long editalId) {
        planner.cancelar(editalId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/foco")
    public PlanoResponse definirFoco(@Valid @RequestBody FocoRequest request) { return planner.definirFoco(request.editalId()); }
}
