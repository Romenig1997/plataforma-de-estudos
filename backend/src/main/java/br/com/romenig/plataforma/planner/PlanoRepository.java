package br.com.romenig.plataforma.planner;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanoRepository extends JpaRepository<PlanoEstudo, Long> {
    /** Todos os cursos em que o aluno esta inscrito (um plano por edital). */
    List<PlanoEstudo> findByUsuarioIdOrderByIdAsc(Long usuarioId);

    Optional<PlanoEstudo> findByUsuarioIdAndEdital_Id(Long usuarioId, Long editalId);

    Optional<PlanoEstudo> findFirstByUsuarioIdAndEmFocoTrue(Long usuarioId);

    List<PlanoEstudo> findByEdital_Id(Long editalId);
}
