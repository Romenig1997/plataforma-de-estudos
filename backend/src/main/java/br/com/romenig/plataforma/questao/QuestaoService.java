package br.com.romenig.plataforma.questao;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.edital.EditalRepository;
import br.com.romenig.plataforma.planner.*;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
@Service
public class QuestaoService {
 public record Revisao(Long id,QuestaoRequest questao,boolean publicada){}
 public record Correcao(boolean correta,int alternativa,int gabarito,String explicacao){}
 /** {@code resposta} e a ultima tentativa; {@code tentativas} conta todas. */
 public record ParaAluno(Long id,Long conteudoId,String conteudo,String enunciado,List<String> alternativas,Correcao resposta,int tentativas){}
 private final QuestaoRepository questoes;private final RespostaQuestaoRepository respostas;private final EditalRepository editais;private final PlanoRepository planos;private final PlannerService planner;private final UsuarioRepository usuarios;
 public QuestaoService(QuestaoRepository q,RespostaQuestaoRepository r,EditalRepository e,PlanoRepository p,PlannerService pl,UsuarioRepository u){questoes=q;respostas=r;editais=e;planos=p;planner=pl;usuarios=u;}
 private Long usuarioId(){var a=SecurityContextHolder.getContext().getAuthentication();if(a==null||!(a.getPrincipal() instanceof SessaoAutenticada s))throw new SessaoInvalidaException();return s.id();}
 private Revisao revisao(Questao q){return new Revisao(q.getId(),new QuestaoRequest(q.getEdital().getId(),q.getConteudo().getId(),q.getEnunciado(),List.copyOf(q.getAlternativas()),q.getGabarito(),q.getExplicacao()),q.isPublicada());}
 @Transactional(readOnly=true) public List<Revisao> listarAdmin(Long editalId){return questoes.findByEditalIdOrderByIdAsc(editalId).stream().map(this::revisao).toList();}
 @Transactional public Revisao salvar(Long id,QuestaoRequest r){
  var e=editais.findById(r.editalId()).orElseThrow(()->new ErroDePlanoException("editalId","Selecione um edital aprovado."));
  var c=e.getDisciplinas().stream().flatMap(d->d.getConteudos().stream()).filter(x->x.getId().equals(r.conteudoId())).findFirst().orElseThrow(()->new ErroDePlanoException("conteudoId","Selecione um tópico deste edital."));
  if(e.getDisciplinas().stream().flatMap(d->d.getConteudos().stream()).anyMatch(x->x.getPai()!=null&&x.getPai().getId().equals(c.getId())))throw new ErroDePlanoException("conteudoId","Selecione um tópico final, não um grupo.");
  if(r.alternativas().stream().map(String::trim).distinct().count()!=4)throw new ErroDePlanoException("alternativas","As quatro alternativas devem ser diferentes.");
  Questao q;if(id==null)q=new Questao(e,c,r);else{q=questoes.bloquear(id).orElseThrow(()->new ErroDePlanoException("questao","Questão não encontrada."));q.atualizar(e,c,r);}
  return revisao(questoes.saveAndFlush(q));
 }
 @Transactional public List<Revisao> importar(List<QuestaoRequest> lote){return lote.stream().map(r->salvar(null,r)).toList();}
 @Transactional public Revisao publicar(Long id){var q=questoes.bloquear(id).orElseThrow(()->new ErroDePlanoException("questao","Questão não encontrada."));q.publicar();questoes.flush();return revisao(q);}
 /** Questoes publicadas de um curso inscrito; sem edital, as do curso em foco. */
 @Transactional(readOnly=true) public List<ParaAluno> listarAluno(Long editalId){
  Long usuario=usuarioId();var plano=planner.selecionar(usuario,editalId);if(plano.isEmpty())return List.of();
  var porQuestao=respostas.tentativasPorQuestao(usuario);
  return questoes.findByEditalIdAndPublicadaTrueOrderByIdAsc(plano.get().getEdital().getId()).stream().map(q->{var t=porQuestao.getOrDefault(q.getId(),List.of());return new ParaAluno(q.getId(),q.getConteudo().getId(),q.getConteudo().getNome(),q.getEnunciado(),List.copyOf(q.getAlternativas()),t.isEmpty()?null:correcao(t.get(t.size()-1)),t.size());}).toList();
 }
 private Correcao correcao(RespostaQuestao r){return new Correcao(r.isCorreta(),r.getAlternativa(),r.getQuestao().getGabarito(),r.getQuestao().getExplicacao());}
 @Transactional public Correcao responder(Long id,int alternativa){
  var usuario=usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);
  var inscritos=planos.findByUsuarioIdOrderByIdAsc(usuario.getId()).stream().map(p->p.getEdital().getId()).toList();
  if(inscritos.isEmpty())throw new ErroDePlanoException("plano","Selecione um plano semanal antes de responder.");
  var q=questoes.bloquear(id).filter(x->x.isPublicada()&&inscritos.contains(x.getEdital().getId())).orElseThrow(()->new ErroDePlanoException("questao","Questão indisponível para os cursos em que você está inscrito."));
  // Cada envio e uma nova tentativa; as anteriores ficam no historico.
  return correcao(respostas.saveAndFlush(new RespostaQuestao(usuario,q,alternativa)));
 }
}
