package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Banner do card do curso, enviado pelo admin (um por edital). */
@Entity
@Table(name = "edital_banner")
public class EditalBanner {

    @Id
    @Column(name = "edital_id")
    private Long editalId;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] imagem;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    protected EditalBanner() {
        // exigido pelo JPA
    }

    public EditalBanner(Long editalId, byte[] imagem, OffsetDateTime atualizadoEm) {
        this.editalId = editalId;
        this.imagem = imagem;
        this.atualizadoEm = atualizadoEm;
    }

    public byte[] getImagem() {
        return imagem;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }
}
