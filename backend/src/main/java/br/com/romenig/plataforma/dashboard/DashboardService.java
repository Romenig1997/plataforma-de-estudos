package br.com.romenig.plataforma.dashboard;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.planner.*;
import br.com.romenig.plataforma.planner.cronograma.*;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
@Service
public class DashboardService {
 private final PlanoRepository planos; private final RegistroRepository registros; private final CronogramaRepository cronogramas; private final UsuarioRepository usuarios; private final br.com.romenig.plataforma.questao.RespostaQuestaoRepository respostas;
 public DashboardService(PlanoRepository p,RegistroRepository r,CronogramaRepository c,UsuarioRepository u,br.com.romenig.plataforma.questao.RespostaQuestaoRepository rQ){planos=p;registros=r;cronogramas=c;usuarios=u;respostas=rQ;}
 private Long usuarioId(){var a=SecurityContextHolder.getContext().getAuthentication();if(a==null||!(a.getPrincipal() instanceof SessaoAutenticada s))throw new SessaoInvalidaException();return s.id();}
 public static double percentual(long parte,long total){return total==0?0:Math.round(10000.0*parte/total)/100.0;}
 @Transactional(readOnly=true)
 public Optional<DashboardResponse> buscar(LocalDateTime agora){
  Long usuario=usuarioId();return planos.findByUsuarioId(usuario).map(plano->{
   Map<Long,int[]> resultados=new HashMap<>();
   respostas.findByUsuarioId(usuario).forEach(r->{var total=resultados.computeIfAbsent(r.getQuestao().getConteudo().getId(),k->new int[2]);total[0]++;if(r.isCorreta())total[1]++;});
   Map<Long,RegistroEstudo> porConteudo=new HashMap<>();registros.findByUsuarioId(usuario).forEach(r->porConteudo.put(r.getConteudoId(),r));
   var disciplinas=plano.getEdital().getDisciplinas().stream().sorted(Comparator.comparing(d->d.getId())).map(d->{
    Set<Long> pais=new HashSet<>();d.getConteudos().stream().filter(c->c.getPai()!=null).forEach(c->pais.add(c.getPai().getId()));
    var topicos=d.getConteudos().stream().filter(c->!pais.contains(c.getId())).sorted(Comparator.comparing(c->c.getId())).map(c->{
     var r=porConteudo.get(c.getId());var resultado=resultados.getOrDefault(c.getId(),new int[2]);return new DashboardResponse.Topico(c.getId(),c.getNome(),c.getPagina(),r!=null&&r.isConcluido(),resultado[0],resultado[1]);
    }).toList();
    long questoes=topicos.stream().mapToLong(DashboardResponse.Topico::questoes).sum(),acertos=topicos.stream().mapToLong(DashboardResponse.Topico::acertos).sum();
    return new DashboardResponse.Disciplina(d.getId(),d.getNome(),questoes,acertos,questoes==0?null:percentual(acertos,questoes),topicos);
   }).toList();
   int total=disciplinas.stream().mapToInt(d->d.topicos().size()).sum();
   int concluidos=(int)disciplinas.stream().flatMap(d->d.topicos().stream()).filter(DashboardResponse.Topico::concluido).count();
   var agenda=cronogramas.findByUsuarioId(usuario).filter(c->c.getEdital().getId().equals(plano.getEdital().getId())).map(CronogramaResponse::de);
   var proximas=agenda.map(c->c.atividades().stream().filter(a->!LocalDateTime.of(a.data(),a.inicio()).isBefore(agora))
    .filter(a->!porConteudo.containsKey(a.conteudoId())||!porConteudo.get(a.conteudoId()).isConcluido()).limit(5).toList()).orElse(List.of());
   return new DashboardResponse(plano.getEdital().getId(),plano.getEdital().getTitulo(),total,concluidos,percentual(concluidos,total),disciplinas,proximas,agenda.map(CronogramaResponse::desatualizado).orElse(false));
  });
 }
 @Transactional
 public void salvar(Long conteudoId,RegistroRequest request){
  var usuario=usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);
  var plano=planos.findByUsuarioId(usuario.getId()).orElseThrow(()->new ErroDePlanoException("plano","Selecione e salve um plano semanal antes de registrar estudos."));
  var conteudo=plano.getEdital().getDisciplinas().stream().flatMap(d->d.getConteudos().stream()).filter(c->c.getId().equals(conteudoId)).findFirst().orElseThrow(()->new ErroDePlanoException("conteudoId","Selecione um tópico do seu edital atual."));
  boolean pai=plano.getEdital().getDisciplinas().stream().flatMap(d->d.getConteudos().stream()).anyMatch(c->c.getPai()!=null&&c.getPai().getId().equals(conteudoId));
  if(pai)throw new ErroDePlanoException("conteudoId","Registre os tópicos finais, sem contar grupos de conteúdos em duplicidade.");
  var registro=registros.findByUsuarioIdAndConteudo_Id(usuario.getId(),conteudoId).orElseGet(()->new RegistroEstudo(usuario,conteudo));
  registro.atualizar(request);registros.saveAndFlush(registro);
 }
}
