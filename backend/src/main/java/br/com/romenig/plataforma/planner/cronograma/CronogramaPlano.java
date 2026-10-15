package br.com.romenig.plataforma.planner.cronograma;

import java.time.OffsetDateTime;
import jakarta.persistence.*;
import br.com.romenig.plataforma.planner.PlanoEstudo;

/** Plano (curso) que entrou na geracao do cronograma, com a versao usada. */
@Entity @Table(name = "cronograma_plano")
public class CronogramaPlano {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cronograma_id") private CronogramaEstudo cronograma;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "plano_id") private PlanoEstudo plano;
    @Column(name = "plano_atualizado_em", nullable = false) private OffsetDateTime planoAtualizadoEm;
    protected CronogramaPlano() { }
    CronogramaPlano(CronogramaEstudo cronograma, PlanoEstudo plano) {
        this.cronograma = cronograma; this.plano = plano; this.planoAtualizadoEm = plano.getAtualizadoEm();
    }
    public PlanoEstudo getPlano() { return plano; }
    /** Registra que o cronograma foi gerado com a versao atual do plano. */
    void renovar() { this.planoAtualizadoEm = plano.getAtualizadoEm(); }
    /** O plano mudou depois que o cronograma foi gerado. */
    boolean desatualizado() { return !planoAtualizadoEm.toInstant().equals(plano.getAtualizadoEm().toInstant()); }
}
