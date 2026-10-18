package br.com.romenig.plataforma.analise;

import java.time.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import br.com.romenig.plataforma.dashboard.DashboardService;

@RestController @RequestMapping("/api/analise")
public class AnaliseController {
 public record Resposta(Long editalId,String editalTitulo,AnalisadorDesempenho.Analise analise) {}
 private final DashboardService dashboard;private final AnalisadorDesempenho analisador;
 public AnaliseController(DashboardService d,AnalisadorDesempenho a){dashboard=d;analisador=a;}
 @GetMapping public ResponseEntity<Resposta> buscar(@org.springframework.web.bind.annotation.RequestParam(required=false) Long editalId){
  // DashboardService isola a sessão e agrega apenas respostas corrigidas pelo servidor.
  return dashboard.buscar(LocalDateTime.now(ZoneId.of("America/Sao_Paulo")),editalId).map(d->ResponseEntity.ok(new Resposta(d.editalId(),d.editalTitulo(),analisador.analisar(
   d.disciplinas().stream().map(x->new AnalisadorDesempenho.Resultado(x.id(),x.nome(),x.questoes(),x.acertos())).toList(),
   d.disciplinas().stream().flatMap(x->x.topicos().stream().map(t->new AnalisadorDesempenho.ResultadoTopico(t.id(),t.nome(),x.id(),x.nome(),t.questoes(),t.acertos()))).toList())))).orElseGet(()->ResponseEntity.noContent().build());
 }
}
