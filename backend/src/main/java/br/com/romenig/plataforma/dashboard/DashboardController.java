package br.com.romenig.plataforma.dashboard;
import java.time.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/dashboard")
public class DashboardController {
 private final DashboardService dashboard;
 public DashboardController(DashboardService d){dashboard=d;}
 @GetMapping public ResponseEntity<DashboardResponse> buscar(@RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) LocalDateTime agora){
  return dashboard.buscar(agora==null?LocalDateTime.now(ZoneId.of("America/Sao_Paulo")):agora).map(ResponseEntity::ok).orElseGet(()->ResponseEntity.noContent().build());
 }
 @PutMapping("/registros/{conteudoId}") public ResponseEntity<Void> salvar(@PathVariable Long conteudoId,@Valid @RequestBody RegistroRequest request){dashboard.salvar(conteudoId,request);return ResponseEntity.noContent().build();}
}
