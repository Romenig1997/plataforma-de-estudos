package br.com.romenig.plataforma.questao;
import java.util.*;
import jakarta.persistence.*;
import br.com.romenig.plataforma.edital.*;
@Entity @Table(name="questao")
public class Questao {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="edital_id") private Edital edital;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="conteudo_id") private Conteudo conteudo;
 @Column(nullable=false,columnDefinition="TEXT") private String enunciado;
 @ElementCollection @CollectionTable(name="questao_alternativa",joinColumns=@JoinColumn(name="questao_id")) @OrderColumn(name="ordem") @Column(name="texto",nullable=false,columnDefinition="TEXT") private List<String> alternativas=new ArrayList<>();
 @Column(nullable=false) private int gabarito;
 @Column(nullable=false,columnDefinition="TEXT") private String explicacao;
 @Column(nullable=false) private boolean publicada;
 protected Questao(){}
 public Questao(Edital e,Conteudo c,QuestaoRequest r){atualizar(e,c,r);}
 public void atualizar(Edital e,Conteudo c,QuestaoRequest r){if(publicada)throw new IllegalStateException("Questões publicadas não podem ser alteradas, preservando a correção das respostas.");edital=e;conteudo=c;enunciado=r.enunciado().trim();alternativas.clear();r.alternativas().forEach(a->alternativas.add(a.trim()));gabarito=r.gabarito();explicacao=r.explicacao().trim();}
 public void publicar(){publicada=true;}
 public Long getId(){return id;} public Edital getEdital(){return edital;} public Conteudo getConteudo(){return conteudo;} public String getEnunciado(){return enunciado;} public List<String> getAlternativas(){return alternativas;} public int getGabarito(){return gabarito;} public String getExplicacao(){return explicacao;} public boolean isPublicada(){return publicada;}
}
