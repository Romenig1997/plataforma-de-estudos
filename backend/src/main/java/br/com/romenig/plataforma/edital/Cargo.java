package br.com.romenig.plataforma.edital;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Cargo de um concurso de um edital aprovado (HU07, incremento A).
 *
 * <p>Nome unico dentro do concurso.
 */
@Entity
@Table(name = "cargo", uniqueConstraints = {
        @UniqueConstraint(name = "uk_cargo_concurso_nome", columnNames = {"concurso_id", "nome"})
})
public class Cargo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "concurso_id", nullable = false)
    private Concurso concurso;

    @Column(nullable = false, length = 255)
    private String nome;

    protected Cargo() {
        // exigido pelo JPA
    }

    public Cargo(Concurso concurso, String nome) {
        this.concurso = concurso;
        this.nome = nome;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }
}