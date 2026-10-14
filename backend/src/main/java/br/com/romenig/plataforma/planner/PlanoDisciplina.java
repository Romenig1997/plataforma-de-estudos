package br.com.romenig.plataforma.planner;

import jakarta.persistence.*;
import br.com.romenig.plataforma.edital.Disciplina;

@Entity
@Table(name = "plano_disciplina")
public class PlanoDisciplina {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "plano_id") private PlanoEstudo plano;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "disciplina_id") private Disciplina disciplina;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 10) private Prioridade prioridade;
    @Column(name = "minutos_semanais", nullable = false) private int minutos;
    protected PlanoDisciplina() { }
    public PlanoDisciplina(PlanoEstudo plano, Disciplina disciplina, Prioridade prioridade, int minutos) {
        this.plano = plano; this.disciplina = disciplina; atualizar(prioridade, minutos);
    }
    public void atualizar(Prioridade prioridade, int minutos) { this.prioridade = prioridade; this.minutos = minutos; }
    public Disciplina getDisciplina() { return disciplina; }
    public Prioridade getPrioridade() { return prioridade; }
    public int getMinutos() { return minutos; }
}
