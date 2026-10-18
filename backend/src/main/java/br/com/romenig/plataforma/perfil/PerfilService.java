package br.com.romenig.plataforma.perfil;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.AutenticacaoService;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.perfil.dto.AtualizaPerfilRequest;
import br.com.romenig.plataforma.perfil.dto.PerfilResponse;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Gerenciamento de perfil da HU03: le e grava os dados do proprio usuario.
 *
 * <p>Nome, meta e objetivo sao gravados na tabela {@code usuario} do
 * Supabase assim que a requisicao termina. O e-mail e a senha pertencem ao
 * Supabase Auth e nao sao alterados por aqui.
 */
@Service
public class PerfilService {

    private final UsuarioRepository usuarios;

    public PerfilService(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public PerfilResponse buscar() {
        return PerfilResponse.de(usuarioDaSessao());
    }

    @Transactional
    public PerfilResponse atualizar(AtualizaPerfilRequest requisicao) {
        Usuario usuario = usuarioDaSessao();
        usuario.atualizarPerfil(
                requisicao.nome().trim(),
                requisicao.metaEstudoSemanal(),
                normalizarObjetivo(requisicao.objetivoMotivacao()));
        usuarios.flush();
        return PerfilResponse.de(usuario);
    }

    /**
     * Objetivo vazio vira {@code null}: o campo e opcional e gravar string em
     * branco criaria dois estados diferentes para "nao preenchido".
     */
    private String normalizarObjetivo(String objetivo) {
        if (objetivo == null) {
            return null;
        }
        String trimmed = objetivo.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Usuario usuarioDaSessao() {
        return usuarios.findById(AutenticacaoService.idDaSessao())
                .orElseThrow(SessaoInvalidaException::new);
    }
}
