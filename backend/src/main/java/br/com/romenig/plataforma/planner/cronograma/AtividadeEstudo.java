package br.com.romenig.plataforma.planner.cronograma;

import java.time.*;
import jakarta.persistence.*;
import br.com.romenig.plataforma.edital.*;

@Entity @Table(name = "atividade_estudo")
public class AtividadeEstudo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "cronograma_id") private CronogramaEstudo cronograma;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "disciplina_id") private Disciplina disciplina;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "conteudo_id") private Conteudo conteudo;
    @Column(nullable = false) private LocalDate data;
    @Column(nullable = false) private LocalTime inicio;
    @Column(nullable = false) private LocalTime fim;
    protected AtividadeEstudo() { }
    public AtividadeEstudo(CronogramaEstudo cronograma, GeradorCronograma.Sessao sessao, Disciplina disciplina, Conteudo conteudo) {
        this.cronograma = cronograma; this.disciplina = disciplina; this.conteudo = conteudo;
        this.data = sessao.data(); this.inicio = sessao.inicio(); this.fim = sessao.fim();
    }
    public Long getId() { return id; }
    public Disciplina getDisciplina() { return disciplina; }
    public Conteudo getConteudo() { return conteudo; }
    public LocalDate getData() { return data; }
    public LocalTime getInicio() { return inicio; }
    public LocalTime getFim() { return fim; }
}
