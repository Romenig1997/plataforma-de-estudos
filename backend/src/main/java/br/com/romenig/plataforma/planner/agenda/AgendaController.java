package br.com.romenig.plataforma.planner.agenda;

import java.util.Map;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Agenda do cronograma (HU18).
 *
 * <p>{@code /api/cronograma/agenda} exige login e devolve o caminho do link
 * secreto. {@code /api/agenda/{token}.ics} e publico (liberado na seguranca),
 * porque os apps de agenda nao fazem login; quem nao tem o token recebe 404.
 */
@RestController
public class AgendaController {

    private static final MediaType CALENDARIO = new MediaType("text", "calendar", java.nio.charset.StandardCharsets.UTF_8);

    private final AgendaDoCronogramaService agenda;

    public AgendaController(AgendaDoCronogramaService agenda) {
        this.agenda = agenda;
    }

    @GetMapping("/api/cronograma/agenda")
    public ResponseEntity<Map<String, String>> link() {
        return semCache(caminho(agenda.tokenDaAgenda()));
    }

    @PostMapping("/api/cronograma/agenda/novo-link")
    public ResponseEntity<Map<String, String>> novoLink() {
        return semCache(caminho(agenda.trocarToken()));
    }

    @GetMapping("/api/agenda/{token}.ics")
    public ResponseEntity<String> calendario(@PathVariable String token) {
        return agenda.calendario(token)
                .map(ics -> ResponseEntity.ok()
                        .contentType(CALENDARIO)
                        .cacheControl(CacheControl.noCache().cachePrivate())
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                ContentDisposition.inline().filename("cronograma-estuda.ics").build().toString())
                        .body(ics))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private static Map<String, String> caminho(String token) {
        return Map.of("caminho", "/api/agenda/" + token + ".ics");
    }

    /** O link e uma credencial: nao fica em cache nenhum. */
    private static ResponseEntity<Map<String, String>> semCache(Map<String, String> corpo) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(corpo);
    }
}
