package br.com.romenig.plataforma.autenticacao;

import java.time.Instant;

import br.com.romenig.plataforma.usuario.Usuario;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** Guarda apenas o hash de links de e-mail; o valor enviado nunca fica no banco. */
@Entity
@Table(name = "token_conta")
public class TokenConta {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private TipoTokenConta tipo;

    @Column(name = "hash_token", nullable = false, length = 64, unique = true)
    private String hashToken;

    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;

    @Column(name = "usado_em")
    private Instant usadoEm;

    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;

    protected TokenConta() { }

    public TokenConta(Usuario usuario, TipoTokenConta tipo, String hashToken, Instant expiraEm) {
        this.usuario = usuario;
        this.tipo = tipo;
        this.hashToken = hashToken;
        this.expiraEm = expiraEm;
        this.criadoEm = Instant.now();
    }

    public Usuario getUsuario() { return usuario; }
    public TipoTokenConta getTipo() { return tipo; }
    public String getHashToken() { return hashToken; }
    public boolean estaValido(Instant agora) { return usadoEm == null && expiraEm.isAfter(agora); }
    public void consumir() { usadoEm = Instant.now(); }
}
