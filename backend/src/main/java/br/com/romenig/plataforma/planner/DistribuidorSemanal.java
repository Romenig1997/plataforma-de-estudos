package br.com.romenig.plataforma.planner;

import java.util.*;
import org.springframework.stereotype.Component;

/** Divisao proporcional em minutos pelo metodo dos maiores restos. */
@Component
public class DistribuidorSemanal {
    public record Entrada(Long disciplinaId, Prioridade prioridade) { }
    public record Parcela(Long disciplinaId, Prioridade prioridade, int minutos) { }

    public List<Parcela> distribuir(int horas, List<Entrada> entradas) {
        if (horas < 1 || horas > 168 || entradas.isEmpty()) throw new IllegalArgumentException("Meta ou disciplinas invalidas.");
        int total = horas * 60;
        int pesos = entradas.stream().mapToInt(e -> e.prioridade().peso()).sum();
        var ordenadas = entradas.stream().sorted(Comparator.comparing(Entrada::disciplinaId)).toList();
        Map<Long, Integer> minutos = new HashMap<>();
        for (var entrada : ordenadas) minutos.put(entrada.disciplinaId(), total * entrada.prioridade().peso() / pesos);
        int restantes = total - minutos.values().stream().mapToInt(Integer::intValue).sum();
        var porResto = ordenadas.stream().sorted(Comparator
                .<Entrada>comparingInt(e -> total * e.prioridade().peso() % pesos).reversed()
                .thenComparing(Entrada::disciplinaId)).toList();
        for (int i = 0; i < restantes; i++) minutos.merge(porResto.get(i).disciplinaId(), 1, Integer::sum);
        return ordenadas.stream().map(e -> new Parcela(e.disciplinaId(), e.prioridade(), minutos.get(e.disciplinaId()))).toList();
    }
}
