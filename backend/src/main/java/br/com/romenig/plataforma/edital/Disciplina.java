package br.com.romenig.plataforma.edital;

import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Disciplina de um edital aprovado (HU07, criterio 3).
 *
 * <p>E o nivel mais alto que o planner usa para montar a grade de estudo:
 * cada disciplina aponta a {@code pagina} de origem no PDF. Nome unico por
 * edital. Os {@link Conteudo}s sao os assuntos (pai NULO) e subassuntos.
 */
@Entity
@Table(name = "disciplina", uniqueConstraints = {
        @UniqueConstraint(name = "uk_disciplina_edital_nome", columnNames = {"edital_id", "nome"})
})
public class Disciplina {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "edital_id", nullable = false)
    private Edital edital;

    @Column(nullable = false, length = 255)
    private String nome;

    @Column(nullable = false)
    private Integer pagina;

    @OneToMany(mappedBy = "disciplina", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Conteudo> conteudos = new ArrayList<>();

    protected Disciplina() {
        // exigido pelo JPA
    }

    public Disciplina(Edital edital, String nome, Integer pagina) {
        this.edital = edital;
        this.nome = nome;
        this.pagina = pagina;
    }

    public void adicionarConteudo(Conteudo conteudo) {
        conteudos.add(conteudo);
        conteudo.definirDisciplina(this);
    }

    void definirDisciplina(Disciplina disciplina) {
        this.edital = disciplina.edital;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public Integer getPagina() {
        return pagina;
    }

    public List<Conteudo> getConteudos() {
        return conteudos;
    }
}