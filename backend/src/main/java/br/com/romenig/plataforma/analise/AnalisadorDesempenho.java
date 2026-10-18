package br.com.romenig.plataforma.analise;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.*;
import org.springframework.stereotype.Component;

/** Recebe somente resultados da fonte interna; nenhum total vem da requisição do aluno. */
@Component
public class AnalisadorDesempenho {
 /** Respostas minimas para um topico entrar na comparacao: uma questao errada sozinha nao vira recomendacao. */
 public static final long MINIMO_POR_TOPICO=3;
 /** Recomendacoes devolvidas, das mais urgentes para as menos. */
 public static final int MAXIMO_DE_RECOMENDACOES=3;
 public record Resultado(Long disciplinaId,String nome,long questoes,long acertos) {}
 public record ResultadoTopico(Long conteudoId,String nome,Long disciplinaId,String disciplina,long questoes,long acertos) {}
 public record Disciplina(Long id,String nome,long questoes,long acertos,Double desempenho,boolean abaixoDosDemais) {}
 public record Topico(Long id,String nome,Long disciplinaId,String disciplina,long questoes,long acertos,Double desempenho,boolean abaixoDosDemais) {}
 public record Recomendacao(Long conteudoId,String conteudo,Long disciplinaId,String disciplina,String mensagem) {}
 public record Analise(Double desempenhoGeral,boolean comparacaoDisponivel,List<Disciplina> disciplinas,List<Topico> topicos,List<Recomendacao> recomendacoes) {}
 private BigDecimal taxa(long a,long q){return BigDecimal.valueOf(a).divide(BigDecimal.valueOf(q),MathContext.DECIMAL128);}
 private double percentual(long a,long q){return taxa(a,q).multiply(BigDecimal.valueOf(100)).setScale(2,java.math.RoundingMode.HALF_UP).doubleValue();}
 private static void validar(long questoes,long acertos){if(questoes<0||acertos<0||acertos>questoes)throw new IllegalArgumentException("Resultados inválidos.");}

 /**
  * Onde focar compara topicos, pois um curso pode ter uma unica disciplina:
  * cada topico com respostas suficientes contra os demais topicos elegiveis juntos.
  * A marcacao por disciplina continua quando o curso tem duas ou mais com respostas.
  */
 public Analise analisar(List<Resultado> resultados,List<ResultadoTopico> resultadosPorTopico){
  Set<Long> ids=new HashSet<>();
  for(var r:resultados){validar(r.questoes(),r.acertos());if(!ids.add(r.disciplinaId()))throw new IllegalArgumentException("Disciplina duplicada.");}
  Set<Long> idsTopicos=new HashSet<>();
  for(var t:resultadosPorTopico){validar(t.questoes(),t.acertos());if(!idsTopicos.add(t.conteudoId()))throw new IllegalArgumentException("Tópico duplicado.");}
  long total=resultados.stream().mapToLong(Resultado::questoes).reduce(0,Math::addExact);
  long acertos=resultados.stream().mapToLong(Resultado::acertos).reduce(0,Math::addExact);
  boolean disciplinasComparaveis=resultados.stream().filter(r->r.questoes()>0).count()>=2;
  List<Disciplina> disciplinas=new ArrayList<>();
  for(var r:resultados){
   boolean inferior=disciplinasComparaveis&&r.questoes()>0&&taxa(r.acertos(),r.questoes()).compareTo(taxa(acertos-r.acertos(),total-r.questoes()))<0;
   disciplinas.add(new Disciplina(r.disciplinaId(),r.nome(),r.questoes(),r.acertos(),r.questoes()==0?null:percentual(r.acertos(),r.questoes()),inferior));
  }

  var elegiveis=resultadosPorTopico.stream().filter(t->t.questoes()>=MINIMO_POR_TOPICO).toList();
  boolean comparavel=elegiveis.size()>=2;
  long totalElegivel=elegiveis.stream().mapToLong(ResultadoTopico::questoes).reduce(0,Math::addExact);
  long acertosElegiveis=elegiveis.stream().mapToLong(ResultadoTopico::acertos).reduce(0,Math::addExact);
  // Diferenca entre o resultado dos demais e o do topico: quanto maior, mais urgente.
  Map<Long,BigDecimal> diferencas=new HashMap<>();
  if(comparavel)for(var t:elegiveis){
   var diferenca=taxa(acertosElegiveis-t.acertos(),totalElegivel-t.questoes()).subtract(taxa(t.acertos(),t.questoes()));
   if(diferenca.signum()>0)diferencas.put(t.conteudoId(),diferenca);
  }
  List<Topico> topicos=resultadosPorTopico.stream().filter(t->t.questoes()>0)
   .map(t->new Topico(t.conteudoId(),t.nome(),t.disciplinaId(),t.disciplina(),t.questoes(),t.acertos(),percentual(t.acertos(),t.questoes()),diferencas.containsKey(t.conteudoId()))).toList();
  List<Recomendacao> recomendacoes=elegiveis.stream().filter(t->diferencas.containsKey(t.conteudoId()))
   .sorted(Comparator.comparing((ResultadoTopico t)->diferencas.get(t.conteudoId())).reversed())
   .limit(MAXIMO_DE_RECOMENDACOES)
   .map(t->new Recomendacao(t.conteudoId(),t.nome(),t.disciplinaId(),t.disciplina(),"Revise "+t.nome()+" e pratique novas questões: seu percentual de acertos neste tópico está abaixo do resultado nos demais tópicos.")).toList();
  return new Analise(total==0?null:percentual(acertos,total),comparavel,List.copyOf(disciplinas),topicos,recomendacoes);
 }
}
