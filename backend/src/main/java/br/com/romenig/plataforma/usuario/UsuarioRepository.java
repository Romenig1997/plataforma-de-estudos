package br.com.romenig.plataforma.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from Usuario u where u.id = :id")
    java.util.Optional<Usuario> buscarParaPlanejar(@org.springframework.data.repository.query.Param("id") Long id);

    /**
     * Usado para impedir o cadastro de um e-mail ja existente. A unicidade
     * tambem esta garantida por constraint no banco (uk_usuario_email).
     */
    boolean existsByEmail(String email);

    /**
     * Entrou na HU02, para o login: e a consulta que carrega a conta e o
     * hash de senha a serem conferidos na autenticacao.
     *
     * O e-mail precisa chegar normalizado (trim + minusculas), como o
     * CadastroUsuarioService gravou.
     */
    Optional<Usuario> findByEmail(String email);
}
