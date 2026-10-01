package br.com.romenig.plataforma.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

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