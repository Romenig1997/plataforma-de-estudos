package br.com.romenig.plataforma.edital.armazenamento;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import br.com.romenig.plataforma.edital.exception.PdfIndisponivelException;

/**
 * Armazenamento de PDFs sem rede, para os testes
 * ({@code plataforma.armazenamento.tipo=memoria}). Nunca e usado em producao.
 */
@Component
@ConditionalOnProperty(name = "plataforma.armazenamento.tipo", havingValue = "memoria")
public class ArmazenamentoDePdfsEmMemoria implements ArmazenamentoDePdfs {

    public static final String PREFIXO_ASSINADO = "https://armazenamento.teste/editais-pdf/assinado/";

    private final Map<String, byte[]> arquivos = new ConcurrentHashMap<>();
    private final AtomicLong assinaturas = new AtomicLong();

    @Override
    public void enviar(String caminho, byte[] pdf, String tokenDoUsuario) {
        arquivos.put(caminho, Arrays.copyOf(pdf, pdf.length));
    }

    @Override
    public byte[] baixar(String caminho, String tokenDoUsuario) {
        byte[] pdf = arquivos.get(caminho);
        if (pdf == null) {
            throw new PdfIndisponivelException(new IllegalStateException("Arquivo inexistente: " + caminho));
        }
        return Arrays.copyOf(pdf, pdf.length);
    }

    @Override
    public String assinar(String caminho, Duration validade, String tokenDoUsuario) {
        if (!arquivos.containsKey(caminho)) {
            throw new PdfIndisponivelException(new IllegalStateException("Arquivo inexistente: " + caminho));
        }
        return PREFIXO_ASSINADO + caminho + "?token=t" + assinaturas.incrementAndGet()
                + "&expiresIn=" + validade.toSeconds();
    }

    @Override
    public void remover(String caminho, String tokenDoUsuario) {
        arquivos.remove(caminho);
    }

    public boolean existe(String caminho) {
        return arquivos.containsKey(caminho);
    }

    public byte[] arquivo(String caminho) {
        return arquivos.get(caminho);
    }

    public void limpar() {
        arquivos.clear();
    }
}
