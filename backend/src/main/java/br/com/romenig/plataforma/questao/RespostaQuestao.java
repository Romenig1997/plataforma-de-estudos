package br.com.romenig.plataforma.questao;
import java.time.OffsetDateTime;
import jakarta.persistence.*;
import br.com.romenig.plataforma.usuario.Usuario;
@Entity @Table(name="resposta_questao",uniqueConstraints=@UniqueConstraint(columnNames={"usuario_id","questao_id"}))
public class RespostaQuestao {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="usuario_id") private Usuario usuario;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="questao_id") private Questao questao;
 @Column(nullable=false) private int alternativa;
 @Column(nullable=false) private boolean correta;
 @Column(name="respondida_em",nullable=false) private OffsetDateTime respondidaEm;
 protected RespostaQuestao(){}
 public RespostaQuestao(Usuario u,Questao q,int a){usuario=u;questao=q;alternativa=a;correta=a==q.getGabarito();respondidaEm=OffsetDateTime.now();}
 public Questao getQuestao(){return questao;} public int getAlternativa(){return alternativa;} public boolean isCorreta(){return correta;}
}
