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

/**
 * Conteudo (assunto ou subassunto) de uma disciplina de um edital aprovado
 * (HU07, criterio 3).
 *
 * <p>A tabela e unica para os dois niveis: assunto tem {@code pai_id} NULO;
 * subassunto aponta o assunto como {@code pai}. A coluna {@code pagina}
 * preserva a referencia de origem no PDF - exigencia da importacao.
 */
@Entity
@Table(name = "conteudo")
public class Conteudo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "disciplina_id", nullable = false)
    private Disciplina disciplina;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "pai_id")
    private Conteudo pai;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String nome;

    @Column(nullable = false)
    private Integer pagina;

    protected Conteudo() {
        // exigido pelo JPA
    }

    public Conteudo(Conteudo pai, String nome, Integer pagina) {
        this.pai = pai;
        this.nome = nome;
        this.pagina = pagina;
    }

    void definirDisciplina(Disciplina disciplina) {
        this.disciplina = disciplina;
    }

    public void renomear(String nome) {
        this.nome = nome;
    }

    public Long getId() {
        return id;
    }

    public Conteudo getPai() {
        return pai;
    }

    public String getNome() {
        return nome;
    }

    public Integer getPagina() {
        return pagina;
    }
}
