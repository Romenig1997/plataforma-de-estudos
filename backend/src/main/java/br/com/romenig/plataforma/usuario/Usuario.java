package br.com.romenig.plataforma.usuario;

import java.time.OffsetDateTime;

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

    @Column(name = "email_verificado", nullable = false)
    private boolean emailVerificado;

    @Column(name = "sessao_versao", nullable = false)
    private int sessaoVersao;

    /**
     * Perfil de acesso (HU04, normalizado na HU05). O banco e a fonte de
     * verdade: desde a HU05 o valor mora na tabela {@code perfil} e aqui fica
     * a referencia pela coluna {@code perfil_id} (relacao 1:N). O cadastro
     * sempre vincula o perfil {@link Perfil#ALUNO}; a promocao a ADMIN e feita
     * pela area admin ({@link #alterarPerfil}). O JWT carrega uma copia do nome do perfil
     * para autorizar sem consultar o banco a cada requisicao.
     */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "perfil_id", nullable = false)
    private Perfil perfil;

    /** Momento do cadastro (V16). Nulo nas contas criadas antes da coluna existir. */
    @Column(name = "criado_em")
    private OffsetDateTime criadoEm;

    protected Usuario() {
        // exigido pelo JPA
    }

    public Usuario(String nome, String email, String senhaHash, Perfil perfil) {
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
        this.perfil = perfil;
        this.criadoEm = OffsetDateTime.now();
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

    public boolean isEmailVerificado() { return emailVerificado; }

    public OffsetDateTime getCriadoEm() { return criadoEm; }

    public int getSessaoVersao() { return sessaoVersao; }

    public void confirmarEmail() { emailVerificado = true; }

    public void definirSenha(String novaSenhaHash) {
        senhaHash = novaSenhaHash;
        invalidarSessoes();
    }

    public void invalidarSessoes() { sessaoVersao++; }

    /**
     * Troca o perfil de acesso pela area admin. O JWT carrega uma copia do
     * perfil, entao os tokens emitidos antes da troca deixam de valer.
     */
    public void alterarPerfil(Perfil novoPerfil) {
        if (perfil.getNome().equals(novoPerfil.getNome())) return;
        perfil = novoPerfil;
        invalidarSessoes();
    }

    public Integer getMetaEstudoSemanal() {
        return metaEstudoSemanal;
    }

    public String getObjetivoMotivacao() {
        return objetivoMotivacao;
    }

    /**
     * Nome do perfil de acesso ({@code ADMIN} ou {@code ALUNO}). E o valor
     * usado no claim do JWT e nas respostas da API - por isso o getter
     * devolve o nome, e nao a entidade, mantendo o contrato das HUs 02/04.
     */
    public String getPerfil() {
        return perfil.getNome();
    }

    /** Perfil de acesso como entidade, para quem precisa do relacionamento. */
    public Perfil getPerfilEntidade() {
        return perfil;
    }
}
