package br.com.romenig.plataforma.dashboard;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RegistroRepository extends JpaRepository<RegistroEstudo,Long>{
 List<RegistroEstudo> findByUsuarioId(Long usuarioId);
 Optional<RegistroEstudo> findByUsuarioIdAndConteudo_Id(Long usuarioId,Long conteudoId);
 List<RegistroEstudo> findByConteudo_Disciplina_Edital_Id(Long editalId);
}
