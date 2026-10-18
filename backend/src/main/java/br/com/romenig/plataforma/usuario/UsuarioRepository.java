package br.com.romenig.plataforma.usuario;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from Usuario u where u.id = :id")
    java.util.Optional<Usuario> buscarParaPlanejar(@org.springframework.data.repository.query.Param("id") Long id);

    /** Perfil da identidade do Supabase Auth: a consulta feita em toda requisicao autenticada. */
    Optional<Usuario> findByAuthId(UUID authId);

    /**
     * Conta pelo e-mail, para vincular contas anteriores ao Supabase Auth. O
     * e-mail precisa chegar normalizado (trim + minusculas).
     */
    Optional<Usuario> findByEmail(String email);

    /** Contagens do resumo da area admin. */
    long countByPerfil_Nome(String nome);

    long countByEmailVerificadoFalse();

    long countByPerfil_NomeAndCriadoEmGreaterThanEqual(String nome, java.time.OffsetDateTime desde);

    /** Cadastros mais recentes; contas sem data (anteriores a V16) ficam de fora. */
    java.util.List<Usuario> findTop5ByCriadoEmNotNullOrderByCriadoEmDesc();
}
