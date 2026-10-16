package br.com.romenig.plataforma.questao;
import java.util.*;
import org.springframework.data.jpa.repository.*;
public interface RespostaQuestaoRepository extends JpaRepository<RespostaQuestao,Long>{
 @EntityGraph(attributePaths={"questao","questao.conteudo"}) List<RespostaQuestao> findByUsuarioIdOrderByIdAsc(Long usuarioId);
 List<RespostaQuestao> findByQuestao_Id(Long questaoId);
 /** Tentativas do aluno agrupadas por questao, da mais antiga para a mais recente. */
 default Map<Long,List<RespostaQuestao>> tentativasPorQuestao(Long usuarioId){
  Map<Long,List<RespostaQuestao>> porQuestao=new HashMap<>();
  findByUsuarioIdOrderByIdAsc(usuarioId).forEach(r->porQuestao.computeIfAbsent(r.getQuestao().getId(),k->new ArrayList<>()).add(r));
  return porQuestao;
 }
}
