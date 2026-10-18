package br.com.romenig.plataforma.questao;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
public interface QuestaoRepository extends JpaRepository<Questao,Long>{
 List<Questao> findByEditalIdOrderByIdAsc(Long editalId);
 List<Questao> findByEditalIdAndPublicadaTrueOrderByIdAsc(Long editalId);
 List<Questao> findByConteudo_IdIn(Collection<Long> conteudoIds);
 long countByPublicada(boolean publicada);
 long countByEdital_IdAndPublicada(Long editalId,boolean publicada);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select q from Questao q where q.id=:id") Optional<Questao> bloquear(@Param("id") Long id);
}
