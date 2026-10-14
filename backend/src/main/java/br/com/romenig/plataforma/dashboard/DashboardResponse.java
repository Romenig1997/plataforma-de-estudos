package br.com.romenig.plataforma.dashboard;
import java.util.List;
import br.com.romenig.plataforma.planner.cronograma.CronogramaResponse;
public record DashboardResponse(Long editalId,String editalTitulo,int totalTopicos,int topicosConcluidos,double progresso,
 List<Disciplina> disciplinas,List<CronogramaResponse.Atividade> proximasAtividades,boolean cronogramaDesatualizado){
 public record Topico(Long id,String nome,int pagina,boolean concluido,int questoes,int acertos){}
 public record Disciplina(Long id,String nome,long questoes,long acertos,Double desempenho,List<Topico> topicos){}
}
