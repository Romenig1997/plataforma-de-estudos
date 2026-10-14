package br.com.romenig.plataforma.perfil.foto;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
@Service
public class FotoPerfilService {
 private final FotoPerfilRepository fotos;private final UsuarioRepository usuarios;private final NormalizadorFoto normalizador;
 public FotoPerfilService(FotoPerfilRepository f,UsuarioRepository u,NormalizadorFoto n){fotos=f;usuarios=u;normalizador=n;}
 private Long usuarioId(){var a=SecurityContextHolder.getContext().getAuthentication();if(a==null||!(a.getPrincipal() instanceof SessaoAutenticada s))throw new SessaoInvalidaException();return s.id();}
 @Transactional(readOnly=true) public Optional<byte[]> buscar(){return fotos.findById(usuarioId()).map(FotoPerfil::getImagem);}
 @Transactional public byte[] salvar(byte[] arquivo){byte[] bytes=normalizador.normalizar(arquivo);var usuario=usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);fotos.saveAndFlush(new FotoPerfil(usuario.getId(),bytes));return bytes;}
 @Transactional public void remover(){var usuario=usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);fotos.findById(usuario.getId()).ifPresent(fotos::delete);fotos.flush();}
}
