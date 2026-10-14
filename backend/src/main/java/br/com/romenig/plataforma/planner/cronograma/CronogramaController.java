package br.com.romenig.plataforma.planner.cronograma;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/cronograma")
public class CronogramaController {
    private final CronogramaService cronograma;
    public CronogramaController(CronogramaService cronograma) { this.cronograma = cronograma; }
    @GetMapping public ResponseEntity<CronogramaResponse> buscar() {
        return cronograma.buscar().map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.noContent().build());
    }
    @PutMapping public CronogramaResponse gerar(@Valid @RequestBody GerarCronogramaRequest request) { return cronograma.gerar(request); }
}
