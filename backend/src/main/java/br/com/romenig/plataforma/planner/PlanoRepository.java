package br.com.romenig.plataforma.planner;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlanoRepository extends JpaRepository<PlanoEstudo, Long> {
    Optional<PlanoEstudo> findByUsuarioId(Long usuarioId);

    List<PlanoEstudo> findByEdital_Id(Long editalId);
}
