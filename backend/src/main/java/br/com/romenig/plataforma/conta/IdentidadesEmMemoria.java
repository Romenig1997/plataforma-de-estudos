package br.com.romenig.plataforma.conta;

import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Identidades removidas, sem banco do Supabase, para os testes
 * ({@code plataforma.identidades.tipo=memoria}). Nunca e usado em producao.
 */
@Component
@ConditionalOnProperty(name = "plataforma.identidades.tipo", havingValue = "memoria")
public class IdentidadesEmMemoria implements IdentidadesDoSupabase {

    private final Set<UUID> removidas = ConcurrentHashMap.newKeySet();

    @Override
    public void remover(UUID authId) {
        removidas.add(authId);
    }

    public boolean foiRemovida(UUID authId) {
        return removidas.contains(authId);
    }
}
