package br.com.romenig.plataforma.questao;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
@RestController
public class QuestaoController {
 private final QuestaoService service;public QuestaoController(QuestaoService s){service=s;}
 public record ResponderRequest(@NotNull @Min(0) @Max(3) Integer alternativa){}
 public record Lote(@NotNull @Size(min=1,max=50) List<@NotNull @Valid QuestaoRequest> questoes){}
 @GetMapping("/api/admin/questoes") public List<QuestaoService.Revisao> listar(@RequestParam Long editalId){return service.listarAdmin(editalId);}
 @PostMapping("/api/admin/questoes") public QuestaoService.Revisao criar(@Valid @RequestBody QuestaoRequest r){return service.salvar(null,r);}
 @PutMapping("/api/admin/questoes/{id}") public QuestaoService.Revisao editar(@PathVariable Long id,@Valid @RequestBody QuestaoRequest r){return service.salvar(id,r);}
 @PostMapping("/api/admin/questoes/lote") public List<QuestaoService.Revisao> importar(@Valid @RequestBody Lote lote){return service.importar(lote.questoes());}
 @PostMapping("/api/admin/questoes/{id}/publicar") public QuestaoService.Revisao publicar(@PathVariable Long id){return service.publicar(id);}
 @GetMapping("/api/questoes") public List<QuestaoService.ParaAluno> questoes(){return service.listarAluno();}
 @PostMapping("/api/questoes/{id}/resposta") public QuestaoService.Correcao responder(@PathVariable Long id,@Valid @RequestBody ResponderRequest r){return service.responder(id,r.alternativa());}
}
