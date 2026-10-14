package br.com.romenig.plataforma.analise;

import java.math.BigDecimal;
import java.math.MathContext;
import java.util.*;
import org.springframework.stereotype.Component;

/** Recebe somente resultados da fonte interna; nenhum total vem da requisição do aluno. */
@Component
public class AnalisadorDesempenho {
 public record Resultado(Long disciplinaId,String nome,long questoes,long acertos) {}
 public record Disciplina(Long id,String nome,long questoes,long acertos,Double desempenho,boolean abaixoDosDemais) {}
 public record Recomendacao(Long disciplinaId,String disciplina,String mensagem) {}
 public record Analise(Double desempenhoGeral,boolean comparacaoDisponivel,List<Disciplina> disciplinas,List<Recomendacao> recomendacoes) {}
 private BigDecimal taxa(long a,long q){return BigDecimal.valueOf(a).divide(BigDecimal.valueOf(q),MathContext.DECIMAL128);}
 private double percentual(long a,long q){return taxa(a,q).multiply(BigDecimal.valueOf(100)).setScale(2,java.math.RoundingMode.HALF_UP).doubleValue();}
 public Analise analisar(List<Resultado> resultados){
  Set<Long> ids=new HashSet<>();
  for(var r:resultados)if(r.questoes()<0||r.acertos()<0||r.acertos()>r.questoes()||!ids.add(r.disciplinaId()))throw new IllegalArgumentException("Resultados inválidos ou disciplina duplicada.");
  long total=resultados.stream().mapToLong(Resultado::questoes).reduce(0,Math::addExact);
  long acertos=resultados.stream().mapToLong(Resultado::acertos).reduce(0,Math::addExact);
  boolean comparavel=resultados.stream().filter(r->r.questoes()>0).count()>=2;
  List<Disciplina> disciplinas=new ArrayList<>();List<Recomendacao> recomendacoes=new ArrayList<>();
  for(var r:resultados){
   boolean inferior=comparavel&&r.questoes()>0&&taxa(r.acertos(),r.questoes()).compareTo(taxa(acertos-r.acertos(),total-r.questoes()))<0;
   disciplinas.add(new Disciplina(r.disciplinaId(),r.nome(),r.questoes(),r.acertos(),r.questoes()==0?null:percentual(r.acertos(),r.questoes()),inferior));
   if(inferior)recomendacoes.add(new Recomendacao(r.disciplinaId(),r.nome(),"Revise os conteúdos de "+r.nome()+" e pratique novas questões: seu percentual de acertos está abaixo do resultado nas demais disciplinas."));
  }
  return new Analise(total==0?null:percentual(acertos,total),comparavel,List.copyOf(disciplinas),List.copyOf(recomendacoes));
 }
}
