package br.com.romenig.plataforma.analise;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
class AnalisadorDesempenhoTest {
 private final AnalisadorDesempenho motor=new AnalisadorDesempenho();
 private AnalisadorDesempenho.Resultado r(long id,long q,long a){return new AnalisadorDesempenho.Resultado(id,"Disciplina "+id,q,a);}
 private AnalisadorDesempenho.ResultadoTopico t(long id,long q,long a){return new AnalisadorDesempenho.ResultadoTopico(id,"Tópico "+id,1L,"Disciplina 1",q,a);}
 private AnalisadorDesempenho.Analise disciplinas(AnalisadorDesempenho.Resultado... rs){return motor.analisar(List.of(rs),List.of());}
 private AnalisadorDesempenho.Analise topicos(AnalisadorDesempenho.ResultadoTopico... ts){long q=Arrays.stream(ts).mapToLong(AnalisadorDesempenho.ResultadoTopico::questoes).sum(),a=Arrays.stream(ts).mapToLong(AnalisadorDesempenho.ResultadoTopico::acertos).sum();return motor.analisar(List.of(r(1,q,a)),List.of(ts));}
 private List<Long> recomendados(AnalisadorDesempenho.Analise a){return a.recomendacoes().stream().map(AnalisadorDesempenho.Recomendacao::conteudoId).toList();}

 @Test void semRespostasNaoCalculaNemRecomenda(){var a=topicos(t(1,0,0));assertThat(a.desempenhoGeral()).isNull();assertThat(a.comparacaoDisponivel()).isFalse();assertThat(a.recomendacoes()).isEmpty();assertThat(a.disciplinas().get(0).desempenho()).isNull();assertThat(a.topicos()).isEmpty();}
 @Test void cursoComUmaDisciplinaComparaTopicos(){var a=topicos(t(1,10,8),t(2,5,1),t(3,0,0));assertThat(a.desempenhoGeral()).isEqualTo(60);assertThat(a.comparacaoDisponivel()).isTrue();assertThat(recomendados(a)).containsExactly(2L);assertThat(a.recomendacoes().get(0).disciplinaId()).isEqualTo(1L);assertThat(a.recomendacoes().get(0).mensagem()).contains("Tópico 2");assertThat(a.topicos()).extracting(AnalisadorDesempenho.Topico::id).containsExactly(1L,2L);assertThat(a.topicos().get(1).abaixoDosDemais()).isTrue();assertThat(a.disciplinas().get(0).abaixoDosDemais()).isFalse();}
 @Test void topicoComPoucasRespostasNaoEntraNaComparacao(){var a=topicos(t(1,10,8),t(2,2,0));assertThat(a.comparacaoDisponivel()).isFalse();assertThat(a.recomendacoes()).isEmpty();assertThat(a.topicos().get(1).desempenho()).isZero();assertThat(a.topicos().get(1).abaixoDosDemais()).isFalse();}
 @Test void ordenaPelaMaiorDiferencaELimitaATres(){var a=topicos(t(1,10,10),t(2,10,6),t(3,10,2),t(4,10,4),t(5,10,5));assertThat(recomendados(a)).containsExactly(3L,4L,5L);}
 @Test void empateNaoGeraRecomendacaoEZeroAcertosSaoDados(){var a=topicos(t(1,10,0),t(2,30,0));assertThat(a.comparacaoDisponivel()).isTrue();assertThat(a.desempenhoGeral()).isZero();assertThat(a.recomendacoes()).isEmpty();}
 @Test void comparacaoNaoUsaPercentuaisArredondados(){var a=topicos(t(1,30000,10000),t(2,30001,10000));assertThat(a.topicos().get(0).desempenho()).isEqualTo(a.topicos().get(1).desempenho());assertThat(recomendados(a)).containsExactly(2L);}
 @Test void marcaDisciplinaAbaixoDasDemaisQuandoHaDuas(){var a=disciplinas(r(1,10,8),r(2,30,12),r(3,0,0));assertThat(a.desempenhoGeral()).isEqualTo(50);assertThat(a.disciplinas().get(0).abaixoDosDemais()).isFalse();assertThat(a.disciplinas().get(1).abaixoDosDemais()).isTrue();assertThat(a.disciplinas().get(2).abaixoDosDemais()).isFalse();}
 @Test void umaDisciplinaNaoEMarcadaAbaixoDasDemais(){var a=disciplinas(r(1,10,2),r(2,0,0));assertThat(a.desempenhoGeral()).isEqualTo(20);assertThat(a.disciplinas()).noneMatch(AnalisadorDesempenho.Disciplina::abaixoDosDemais);}
 @Test void rejeitaResultadosInvalidosEDuplicados(){
  assertThatThrownBy(()->disciplinas(r(1,1,2))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->disciplinas(r(1,1,1),r(1,2,1))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->topicos(t(1,1,2))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->motor.analisar(List.of(),List.of(t(1,1,1),t(1,2,1)))).isInstanceOf(IllegalArgumentException.class);
 }
}
