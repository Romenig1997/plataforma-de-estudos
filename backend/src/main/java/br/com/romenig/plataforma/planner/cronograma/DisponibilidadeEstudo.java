package br.com.romenig.plataforma.planner.cronograma;

import java.time.LocalTime;
import jakarta.persistence.*;

@Entity @Table(name = "disponibilidade_estudo")
public class DisponibilidadeEstudo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cronograma_id") private CronogramaEstudo cronograma;
    @Column(name = "dia_semana", nullable = false) private int diaSemana;
    @Column(nullable = false) private LocalTime inicio;
    @Column(nullable = false) private LocalTime fim;
    protected DisponibilidadeEstudo() { }
    public DisponibilidadeEstudo(CronogramaEstudo cronograma, GerarCronogramaRequest.PeriodoDisponivel periodo) {
        this.cronograma = cronograma; this.diaSemana = periodo.diaSemana(); this.inicio = periodo.inicio(); this.fim = periodo.fim();
    }
    public int getDiaSemana() { return diaSemana; }
    public LocalTime getInicio() { return inicio; }
    public LocalTime getFim() { return fim; }
}
