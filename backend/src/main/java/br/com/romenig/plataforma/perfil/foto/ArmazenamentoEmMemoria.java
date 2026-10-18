package br.com.romenig.plataforma.perfil.foto;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Armazenamento de fotos sem rede, para os testes
 * ({@code plataforma.armazenamento.tipo=memoria}). Nunca e usado em producao.
 */
@Component
@ConditionalOnProperty(name = "plataforma.armazenamento.tipo", havingValue = "memoria")
public class ArmazenamentoEmMemoria implements ArmazenamentoDeFotos {

    static final String PREFIXO = "https://armazenamento.teste/avatars/";

    private final Map<String, byte[]> arquivos = new ConcurrentHashMap<>();
    private final AtomicLong sequencia = new AtomicLong();

    @Override
    public String enviar(UUID dono, byte[] png, String tokenDoUsuario) {
        String url = PREFIXO + dono + "/avatar-" + sequencia.incrementAndGet() + ".png";
        arquivos.put(url, png);
        return url;
    }

    @Override
    public void remover(String url, String tokenDoUsuario) {
        arquivos.remove(url);
    }

    public byte[] arquivo(String url) {
        return arquivos.get(url);
    }
}
