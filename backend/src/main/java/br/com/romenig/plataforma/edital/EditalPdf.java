package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;
import java.util.Arrays;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * PDF original do edital importado (HU07, incremento A).
 *
 * <p>Guarda o arquivo em si ({@code bytes}, no banco) e o {@code sha256} para a
 * deduplicacao: o mesmo conteudo importado duas vezes - ainda que com outro
 * nome - cai como duplicado. O {@code sha256} e unico por decisao de escopo.
 */
@Entity
@Table(name = "edital_pdf")
public class EditalPdf {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_original", nullable = false, length = 255)
    private String nomeOriginal;

    @Column(name = "tamanho_bytes", nullable = false)
    private Long tamanhoBytes;

    @Column(name = "tipo", nullable = false, length = 50)
    private String tipo;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @Column(name = "bytes", nullable = false)
    private byte[] bytes;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    protected EditalPdf() {
        // exigido pelo JPA
    }

    public EditalPdf(String nomeOriginal, Long tamanhoBytes, String tipo,
                     String sha256, byte[] bytes, OffsetDateTime criadoEm) {
        this.nomeOriginal = nomeOriginal;
        this.tamanhoBytes = tamanhoBytes;
        this.tipo = tipo;
        this.sha256 = sha256;
        this.bytes = Arrays.copyOf(bytes, bytes.length);
        this.criadoEm = criadoEm;
    }

    public Long getId() {
        return id;
    }

    public String getNomeOriginal() {
        return nomeOriginal;
    }

    public Long getTamanhoBytes() {
        return tamanhoBytes;
    }

    public String getTipo() {
        return tipo;
    }

    public String getSha256() {
        return sha256;
    }

    public byte[] getBytes() {
        return Arrays.copyOf(bytes, bytes.length);
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }
}