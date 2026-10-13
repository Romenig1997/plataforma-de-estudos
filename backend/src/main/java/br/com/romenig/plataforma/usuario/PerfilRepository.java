package br.com.romenig.plataforma.usuario;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acesso ao catalogo de perfis de acesso (HU05).
 *
 * <p>A busca por nome e o que o cadastro usa para vincular toda conta nova ao
 * perfil {@link Perfil#ALUNO}. As linhas sao criadas pela migration V2, nao
 * pela aplicacao.
 */
public interface PerfilRepository extends JpaRepository<Perfil, Long> {

    Optional<Perfil> findByNome(String nome);
}
