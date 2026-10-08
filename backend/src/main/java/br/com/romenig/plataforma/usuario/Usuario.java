package br.com.romenig.plataforma.usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Usuario cadastrado pela HU01.
 *
 * A senha nunca e armazenada em claro: o campo guarda o codigo PBKDF2
 * gerado por {@link CodificadorDeSenha}.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome", nullable = false, length = 120)
    private String nome;

    @Column(name = "email", nullable = false, length = 180)
    private String email;

    @Column(name = "senha_hash", nullable = false, length = 255)
    private String senhaHash;

    /**
     * HU03: meta de horas de estudo por semana. Nula quando a pessoa ainda
     * nao definiu uma - campo opcional por decisao do escopo.
     */
    @Column(name = "meta_estudo_semanal")
    private Integer metaEstudoSemanal;

    /**
     * HU03: objetivo ou motivacao do estudo, texto livre. Nulo quando nao
     * preenchido.
     */
    @Column(name = "objetivo_motivacao", length = 500)
    private String objetivoMotivacao;

    protected Usuario() {
        // exigido pelo JPA
    }

    public Usuario(String nome, String email, String senhaHash) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
    }

    /**
     * HU03: atualiza os dados editaveis do perfil. A senha nunca passa por
     * aqui - troca de senha fica fora do escopo desta HU.
     */
    public void atualizarPerfil(String nome, String email,
                                Integer metaEstudoSemanal, String objetivoMotivacao) {
        this.nome = nome;
        this.email = email;
        this.metaEstudoSemanal = metaEstudoSemanal;
        this.objetivoMotivacao = objetivoMotivacao;
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public Integer getMetaEstudoSemanal() {
        return metaEstudoSemanal;
    }

    public String getObjetivoMotivacao() {
        return objetivoMotivacao;
    }
}