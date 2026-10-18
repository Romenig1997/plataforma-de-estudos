package br.com.romenig.plataforma.perfil.foto;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.AutenticacaoService;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Foto do perfil (HU03): a imagem e validada e reduzida aqui, gravada no
 * Supabase Storage e a URL publica fica em {@code usuario.avatar_url}.
 */
@Service
public class FotoPerfilService {

    private final UsuarioRepository usuarios;
    private final NormalizadorFoto normalizador;
    private final ArmazenamentoDeFotos armazenamento;

    public FotoPerfilService(UsuarioRepository usuarios, NormalizadorFoto normalizador,
                             ArmazenamentoDeFotos armazenamento) {
        this.usuarios = usuarios;
        this.normalizador = normalizador;
        this.armazenamento = armazenamento;
    }

    /** Grava a nova foto e devolve a URL publica dela. */
    @Transactional
    public String salvar(byte[] arquivo) {
        byte[] png = normalizador.normalizar(arquivo);
        Usuario usuario = usuarioDaSessao();
        String token = AutenticacaoService.tokenDaSessao();
        String anterior = usuario.getAvatarUrl();

        String nova = armazenamento.enviar(usuario.getAuthId(), png, token);
        usuario.definirFoto(nova);
        usuarios.flush();
        if (anterior != null) {
            armazenamento.remover(anterior, token);
        }
        return nova;
    }

    @Transactional
    public void remover() {
        Usuario usuario = usuarioDaSessao();
        String anterior = usuario.getAvatarUrl();
        usuario.definirFoto(null);
        usuarios.flush();
        if (anterior != null) {
            armazenamento.remover(anterior, AutenticacaoService.tokenDaSessao());
        }
    }

    private Usuario usuarioDaSessao() {
        Usuario usuario = usuarios.buscarParaPlanejar(AutenticacaoService.idDaSessao())
                .orElseThrow(SessaoInvalidaException::new);
        if (usuario.getAuthId() == null) {
            throw new SessaoInvalidaException();
        }
        return usuario;
    }
}
