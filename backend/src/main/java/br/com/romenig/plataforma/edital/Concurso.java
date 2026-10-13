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
 * Concurso listado em um edital aprovado (HU07, incremento A).
 *
 * <p>Metadado do edital: o planner organiza estudo por {@link Disciplina} e
 * {@link Conteudo}; o concurso (e seus {@link Cargo}s) descreve o que o edital
 * abre. Nome unico por edital.
 */
@Entity
@Table(name = "concurso", uniqueConstraints = {
        @UniqueConstraint(name = "uk_concurso_edital_nome", columnNames = {"edital_id", "nome"})
})
public class Concurso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "edital_id", nullable = false)
    private Edital edital;

    @Column(nullable = false, length = 255)
    private String nome;

    @OneToMany(mappedBy = "concurso", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Cargo> cargos = new ArrayList<>();

    protected Concurso() {
        // exigido pelo JPA
    }

    public Concurso(Edital edital, String nome) {
        this.edital = edital;
        this.nome = nome;
    }

    public void adicionarCargo(Cargo cargo) {
        cargos.add(cargo);
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public List<Cargo> getCargos() {
        return cargos;
    }
}