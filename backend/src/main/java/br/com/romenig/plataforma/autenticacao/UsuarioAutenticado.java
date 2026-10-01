package br.com.romenig.plataforma.autenticacao;

import java.util.Collection;
import java.util.List;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Adaptador entre a entidade {@link Usuario} da HU01 e o {@link UserDetails}
 * que o Spring Security usa na etapa de autenticacao.
 *
 * <p>Nao existe nenhuma permissao aqui de proposito: os perfis ADMIN e ALUNO
 * sao a HU04. O que a HU02 precisa e apenas saber quem autenticou e com qual
 * hash de senha conferir a senha informada.
 *
 * <p>{@link #getPassword()} devolve o <em>hash</em> PBKDF2, nunca a senha em
 * claro: a entidade da HU01 nao guarda a senha original.
 */
public class UsuarioAutenticado implements UserDetails {

    private final Long id;
    private final String nome;
    private final String email;
    private final String senhaHash;

    public UsuarioAutenticado(Usuario usuario) {
        this.id = usuario.getId();
        this.nome = usuario.getNome();
        this.email = usuario.getEmail();
        this.senhaHash = usuario.getSenhaHash();
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

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of();
    }

    @Override
    public String getPassword() {
        return senhaHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}