package br.com.romenig.plataforma.usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Perfil de acesso (HU05): catalogo {@code ADMIN}/{@code ALUNO} em tabela
 * propria.
 *
 * <p>Antes da HU05 o perfil era uma coluna de texto em {@code usuario} (HU04).
 * A HU05 normalizou o dado: existe a tabela {@code perfil} e
 * {@code usuario.perfil_id} aponta para ela (relacao 1:N - um perfil tem
 * muitos usuarios).
 *
 * <p>As duas linhas validas ({@code ADMIN} e {@code ALUNO}) sao semeadas
 * pela migration {@code V2__perfil_como_tabela.sql}; a lista nao e editavel
 * pela API. O nome e o valor que trafega no claim {@code perfil} do JWT e nas
 * respostas de login/{@code /me}, de modo que o contrato HTTP nao mudou.
 */
@Entity
@Table(name = "perfil")
public class Perfil {

    /** Nome do perfil com acesso a area administrativa. */
    public static final String ADMIN = "ADMIN";

    /** Nome do perfil padrao de todo cadastro. */
    public static final String ALUNO = "ALUNO";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome", nullable = false, length = 20)
    private String nome;

    @Column(name = "descricao", length = 120)
    private String descricao;

    protected Perfil() {
        // exigido pelo JPA
    }

    public Perfil(String nome, String descricao) {
        this.nome = nome;
        this.descricao = descricao;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getDescricao() {
        return descricao;
    }
}
