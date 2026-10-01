package br.com.romenig.plataforma.usuario;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /**
     * Usado para impedir o cadastro de um e-mail ja existente. A unicidade
     * tambem esta garantida por constraint no banco (uk_usuario_email).
     */
    boolean existsByEmail(String email);
}