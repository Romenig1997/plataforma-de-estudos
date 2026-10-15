package br.com.romenig.plataforma.questao;
import java.util.*;
import org.springframework.data.jpa.repository.*;
public interface RespostaQuestaoRepository extends JpaRepository<RespostaQuestao,Long>{
 @EntityGraph(attributePaths={"questao","questao.conteudo"}) List<RespostaQuestao> findByUsuarioId(Long usuarioId);
 boolean existsByUsuarioIdAndQuestaoId(Long usuarioId,Long questaoId);
 List<RespostaQuestao> findByQuestao_Id(Long questaoId);
}
