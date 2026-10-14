package br.com.romenig.plataforma.analise;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
class AnalisadorDesempenhoTest {
 private final AnalisadorDesempenho motor=new AnalisadorDesempenho();
 private AnalisadorDesempenho.Resultado r(long id,long q,long a){return new AnalisadorDesempenho.Resultado(id,"Disciplina "+id,q,a);}
 @Test void semRespostasNaoCalculaNemRecomenda(){var a=motor.analisar(List.of(r(1,0,0)));assertThat(a.desempenhoGeral()).isNull();assertThat(a.comparacaoDisponivel()).isFalse();assertThat(a.recomendacoes()).isEmpty();assertThat(a.disciplinas().get(0).desempenho()).isNull();}
 @Test void umaDisciplinaTemPercentualMasNaoPermiteComparacao(){var a=motor.analisar(List.of(r(1,10,8),r(2,0,0)));assertThat(a.desempenhoGeral()).isEqualTo(80);assertThat(a.comparacaoDisponivel()).isFalse();assertThat(a.recomendacoes()).isEmpty();}
 @Test void calculaPonderadoERecomendaApenasInferiores(){var a=motor.analisar(List.of(r(1,10,8),r(2,30,12),r(3,0,0)));assertThat(a.desempenhoGeral()).isEqualTo(50);assertThat(a.disciplinas().get(0).abaixoDosDemais()).isFalse();assertThat(a.disciplinas().get(1).abaixoDosDemais()).isTrue();assertThat(a.recomendacoes()).extracting(AnalisadorDesempenho.Recomendacao::disciplinaId).containsExactly(2L);}
 @Test void empateNaoGeraRecomendacaoEZeroAcertosSaoDados(){var a=motor.analisar(List.of(r(1,10,0),r(2,30,0)));assertThat(a.comparacaoDisponivel()).isTrue();assertThat(a.desempenhoGeral()).isZero();assertThat(a.recomendacoes()).isEmpty();}
 @Test void comparacaoNaoUsaPercentuaisArredondados(){var a=motor.analisar(List.of(r(1,30000,10000),r(2,30001,10000)));assertThat(a.disciplinas().get(0).desempenho()).isEqualTo(a.disciplinas().get(1).desempenho());assertThat(a.recomendacoes()).extracting(AnalisadorDesempenho.Recomendacao::disciplinaId).containsExactly(2L);}
 @Test void rejeitaResultadosInvalidosEDuplicados(){assertThatThrownBy(()->motor.analisar(List.of(r(1,1,2)))).isInstanceOf(IllegalArgumentException.class);assertThatThrownBy(()->motor.analisar(List.of(r(1,1,1),r(1,2,1)))).isInstanceOf(IllegalArgumentException.class);}
}
