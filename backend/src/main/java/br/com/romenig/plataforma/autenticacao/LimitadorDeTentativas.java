package br.com.romenig.plataforma.autenticacao;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

/** Limitador em memoria para uma instancia. Em escala horizontal, substitua por Redis/WAF. */
@Service
public class LimitadorDeTentativas {
    private final ConcurrentHashMap<String, Deque<Instant>> tentativas = new ConcurrentHashMap<>();
    private final boolean habilitado;

    public LimitadorDeTentativas(@Value("${plataforma.limites.habilitado:true}") boolean habilitado) {
        this.habilitado = habilitado;
    }

    public void exigirDisponivel(String acao, String identidade, int maximo, Duration janela) {
        if (!habilitado) return;
        Instant agora = Instant.now();
        String chave = acao + ":" + identidade;
        Deque<Instant> fila = tentativas.computeIfAbsent(chave, ignorado -> new ArrayDeque<>());
        synchronized (fila) {
            while (!fila.isEmpty() && !fila.peekFirst().plus(janela).isAfter(agora)) fila.removeFirst();
            if (fila.size() >= maximo) {
                long segundos = Math.max(1, Duration.between(agora, fila.peekFirst().plus(janela)).toSeconds());
                throw new LimiteDeTentativasException(segundos);
            }
            fila.addLast(agora);
        }
    }
}
