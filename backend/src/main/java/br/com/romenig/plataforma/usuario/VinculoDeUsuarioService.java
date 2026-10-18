package br.com.romenig.plataforma.usuario;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.IdentidadeSupabase;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;

/**
 * Encontra o perfil da aplicacao de uma identidade do Supabase Auth.
 *
 * <p>No Supabase, o gatilho {@code sincronizar_perfil_do_auth} ja cria o
 * perfil no cadastro. Este servico cobre o mesmo caso quando o gatilho nao
 * existe (testes com H2) e vincula, no primeiro acesso, uma conta antiga de
 * mesmo e-mail. Como o Supabase so emite token para e-mail confirmado, o
 * vinculo nao permite assumir a conta de outra pessoa.
 *
 * <p>Todo perfil novo nasce {@link Perfil#ALUNO}.
 */
@Service
public class VinculoDeUsuarioService {

    private final UsuarioRepository usuarios;
    private final PerfilRepository perfis;

    public VinculoDeUsuarioService(UsuarioRepository usuarios, PerfilRepository perfis) {
        this.usuarios = usuarios;
        this.perfis = perfis;
    }

    @Transactional
    public Usuario perfilDe(IdentidadeSupabase identidade) {
        var vinculado = usuarios.findByAuthId(identidade.id());
        if (vinculado.isPresent()) {
            return vinculado.get();
        }

        if (identidade.email() == null || identidade.email().isBlank()) {
            throw new SessaoInvalidaException();
        }
        String email = identidade.email().trim().toLowerCase(Locale.ROOT);

        var mesmoEmail = usuarios.findByEmail(email);
        if (mesmoEmail.isPresent()) {
            Usuario antigo = mesmoEmail.get();
            if (antigo.getAuthId() != null) {
                // O e-mail ja pertence a outra identidade do Supabase Auth.
                throw new SessaoInvalidaException();
            }
            antigo.vincularIdentidade(identidade.id());
            return antigo;
        }

        Perfil aluno = perfis.findByNome(Perfil.ALUNO)
                .orElseThrow(() -> new IllegalStateException("Perfil ALUNO ausente no banco."));
        return usuarios.saveAndFlush(new Usuario(identidade.id(), nomeDe(identidade, email), email, aluno));
    }

    private static String nomeDe(IdentidadeSupabase identidade, String email) {
        String nome = identidade.nome() != null && !identidade.nome().isBlank()
                ? identidade.nome().trim()
                : email.substring(0, email.indexOf('@') > 0 ? email.indexOf('@') : email.length());
        return nome.length() > 120 ? nome.substring(0, 120) : nome;
    }
}
