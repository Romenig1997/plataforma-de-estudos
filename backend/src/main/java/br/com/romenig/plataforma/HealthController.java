package br.com.romenig.plataforma;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoint TEMPORARIO de sanidade do esqueleto do projeto.
 *
 * Nao pertence a nenhuma Historia de Usuario e existe apenas para validar
 * que o backend sobe na primeira execucao. REMOVER APOS essa validacao.
 *
 * Depois da remocao a verificacao continua possivel por dois caminhos:
 * o teste de contexto (PlataformaApplicationTests) e o log de startup do
 * Spring Boot.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "UP");
    }
}