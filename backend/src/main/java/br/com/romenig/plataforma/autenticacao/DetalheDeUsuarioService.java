package br.com.romenig.plataforma.autenticacao;

import java.util.Locale;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Carrega o usuario cadastrado para o Spring Security conferir a senha.
 *
 * <p>A busca normaliza o e-mail da mesma forma que o
 * {@code CadastroUsuarioService} fez no cadastro. Sem isso,
 * "Ana@Email.com" nao encontraria a conta gravada como "ana@email.com" e o
 * login falharia para quem digitou maiusculas ou espacos.
 *
 * <p>A excecao de e-mail inexistente carrega a MESMA mensagem de credencial
 * invalida usada no login. O Spring Security troca
 * {@link UsernameNotFoundException} por {@code BadCredentialsException} antes
 * de ela chegar na resposta, e a mensagem generica evita que o atacante
 * descubra quais e-mails tem cadastro na plataforma.
 */
@Service
public class DetalheDeUsuarioService implements UserDetailsService {

    private final UsuarioRepository usuarios;

    public DetalheDeUsuarioService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    public UserDetails loadUserByUsername(String email) {
        String normalizado = email.trim().toLowerCase(Locale.ROOT);

        Usuario usuario = usuarios.findByEmail(normalizado)
                .orElseThrow(() -> new UsernameNotFoundException("E-mail ou senha invalidos."));

        return new UsuarioAutenticado(usuario);
    }
}