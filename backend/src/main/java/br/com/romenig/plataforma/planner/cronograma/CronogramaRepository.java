package br.com.romenig.plataforma.planner.cronograma;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CronogramaRepository extends JpaRepository<CronogramaEstudo, Long> {
    Optional<CronogramaEstudo> findByUsuarioId(Long usuarioId);

    List<CronogramaEstudo> findByEdital_Id(Long editalId);
}
