package br.com.romenig.plataforma.dashboard;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.edital.Conteudo;
@Entity @Table(name="registro_estudo",uniqueConstraints=@UniqueConstraint(columnNames={"usuario_id","conteudo_id"}))
public class RegistroEstudo {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="usuario_id") private Usuario usuario;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="conteudo_id") private Conteudo conteudo;
 @Column(nullable=false) private boolean concluido;
 @Column(nullable=false) private int questoes;
 @Column(nullable=false) private int acertos;
 @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm;
 protected RegistroEstudo() {}
 public RegistroEstudo(Usuario usuario,Conteudo conteudo){this.usuario=usuario;this.conteudo=conteudo;}
 public void atualizar(RegistroRequest r){concluido=r.concluido();atualizadoEm=OffsetDateTime.now();}
 public Long getConteudoId(){return conteudo.getId();}
 public boolean isConcluido(){return concluido;}
 public int getQuestoes(){return questoes;}
 public int getAcertos(){return acertos;}
}
