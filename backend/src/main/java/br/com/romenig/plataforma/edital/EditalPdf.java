package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Metadados do PDF original do edital importado (HU07, incremento A).
 *
 * <p>O {@code sha256} faz a deduplicacao: o mesmo conteudo importado duas
 * vezes - ainda que com outro nome - cai como duplicado. O {@code sha256} e
 * unico por decisao de escopo.
 *
 * <p>O arquivo nao e mapeado aqui de proposito: desde a V19 ele fica no
 * Supabase Storage em {@code caminhoStorage}. PDFs antigos ainda tem o
 * conteudo na coluna {@code bytes}, lida somente por {@link ArquivosDePdf}
 * quando alguem abre o arquivo. Sem o campo na entidade, carregar um edital
 * (o vinculo e EAGER) nunca puxa o bytea do Postgres.
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

    /** {@code editais/{sha256}.pdf} no bucket privado; {@code null} nos PDFs legados em bytea. */
    @Column(name = "caminho_storage", length = 255)
    private String caminhoStorage;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    protected EditalPdf() {
        // exigido pelo JPA
    }

    public EditalPdf(String nomeOriginal, Long tamanhoBytes, String tipo,
                     String sha256, String caminhoStorage, OffsetDateTime criadoEm) {
        this.nomeOriginal = nomeOriginal;
        this.tamanhoBytes = tamanhoBytes;
        this.tipo = tipo;
        this.sha256 = sha256;
        this.caminhoStorage = caminhoStorage;
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

    public String getCaminhoStorage() {
        return caminhoStorage;
    }

    /** PDF legado: o conteudo ainda esta na coluna bytea. */
    public boolean isLegado() {
        return caminhoStorage == null;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }
}