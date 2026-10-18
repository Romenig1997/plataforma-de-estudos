package br.com.romenig.plataforma.usuario;

import java.time.OffsetDateTime;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Perfil do usuario na aplicacao.
 *
 * <p>Desde a V17 a identidade e a senha moram no Supabase Auth
 * ({@code auth.users}); esta entidade guarda o que e da plataforma: nome,
 * foto, papel de acesso e preferencias de estudo. {@link #getAuthId()} liga o
 * perfil a identidade do Supabase. Nenhuma senha passa por aqui.
 */
@Entity
@Table(name = "usuario")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** {@code auth.users.id} do Supabase. Nulo apenas em contas antigas ainda nao vinculadas. */
    @Column(name = "auth_id", unique = true)
    private UUID authId;

    @Column(name = "nome", nullable = false, length = 120)
    private String nome;

    @Column(name = "email", nullable = false, length = 180)
    private String email;

    /** URL publica da foto no Supabase Storage; nula quando nao ha foto. */
    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

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

    /** Copia do estado de confirmacao do e-mail no Supabase Auth, para o painel admin. */
    @Column(name = "email_verificado", nullable = false)
    private boolean emailVerificado;

    /**
     * Perfil de acesso (HU04, normalizado na HU05). O banco e a fonte de
     * verdade: o valor mora na tabela {@code perfil} e e lido a cada
     * requisicao, entao uma promocao ou rebaixamento vale imediatamente. Todo
     * cadastro nasce {@link Perfil#ALUNO}; a troca e feita pela area admin.
     */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "perfil_id", nullable = false)
    private Perfil perfil;

    /** Momento do cadastro (V16). Nulo nas contas criadas antes da coluna existir. */
    @Column(name = "criado_em")
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    protected Usuario() {
        // exigido pelo JPA
    }

    /** Perfil criado no primeiro acesso de uma identidade do Supabase Auth. */
    public Usuario(UUID authId, String nome, String email, Perfil perfil) {
        this.authId = authId;
        this.nome = nome;
        this.email = email;
        this.perfil = perfil;
        // So chega aqui quem entrou com o Supabase Auth, que exige o e-mail confirmado.
        this.emailVerificado = true;
        this.criadoEm = OffsetDateTime.now();
        this.atualizadoEm = criadoEm;
    }

    @PreUpdate
    void marcarAtualizacao() {
        atualizadoEm = OffsetDateTime.now();
    }

    /** Liga uma conta anterior ao Supabase Auth a identidade de mesmo e-mail. */
    public void vincularIdentidade(UUID novoAuthId) {
        if (authId != null) {
            throw new IllegalStateException("Este perfil ja esta vinculado a outra identidade.");
        }
        authId = novoAuthId;
        emailVerificado = true;
    }

    /** HU03: dados editaveis do perfil. O e-mail e a senha sao do Supabase Auth. */
    public void atualizarPerfil(String nome, Integer metaEstudoSemanal, String objetivoMotivacao) {
        this.nome = nome;
        this.metaEstudoSemanal = metaEstudoSemanal;
        this.objetivoMotivacao = objetivoMotivacao;
    }

    public void definirFoto(String novaUrl) {
        avatarUrl = novaUrl;
    }

    /** Troca o perfil de acesso pela area admin; vale a partir da proxima requisicao. */
    public void alterarPerfil(Perfil novoPerfil) {
        perfil = novoPerfil;
    }

    public Long getId() {
        return id;
    }

    public UUID getAuthId() {
        return authId;
    }

    public String getNome() {
        return nome;
    }

    public String getEmail() {
        return email;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public boolean isEmailVerificado() {
        return emailVerificado;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }

    public Integer getMetaEstudoSemanal() {
        return metaEstudoSemanal;
    }

    public String getObjetivoMotivacao() {
        return objetivoMotivacao;
    }

    /**
     * Nome do perfil de acesso ({@code ADMIN} ou {@code ALUNO}), o valor usado
     * nas respostas da API e como authority do Spring Security.
     */
    public String getPerfil() {
        return perfil.getNome();
    }

    /** Perfil de acesso como entidade, para quem precisa do relacionamento. */
    public Perfil getPerfilEntidade() {
        return perfil;
    }
}
