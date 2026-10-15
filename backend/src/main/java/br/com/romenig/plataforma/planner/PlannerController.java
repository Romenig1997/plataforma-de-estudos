package br.com.romenig.plataforma.planner;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/planner")
public class PlannerController {
    private final PlannerService planner;
    public PlannerController(PlannerService planner) { this.planner = planner; }
    @GetMapping
    public ResponseEntity<PlanoResponse> buscar(@RequestParam(required = false) Long editalId) {
        return planner.buscar(editalId).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }
    @PutMapping
    public PlanoResponse gerar(@Valid @RequestBody GerarPlanoRequest request) { return planner.gerar(request); }
}
