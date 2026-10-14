package br.com.romenig.plataforma.autenticacao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TokenContaRepository extends JpaRepository<TokenConta, Long> {
    Optional<TokenConta> findByHashTokenAndTipo(String hashToken, TipoTokenConta tipo);
    List<TokenConta> findByUsuario_IdAndTipoAndUsadoEmIsNull(Long usuarioId, TipoTokenConta tipo);
}
