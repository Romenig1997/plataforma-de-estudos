package br.com.romenig.plataforma.planner.cronograma;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.planner.*;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

@Service
public class CronogramaService {
    private final UsuarioRepository usuarios;
    private final PlanoRepository planos;
    private final CronogramaRepository cronogramas;
    private final GeradorCronograma gerador;
    public CronogramaService(UsuarioRepository usuarios, PlanoRepository planos, CronogramaRepository cronogramas, GeradorCronograma gerador) {
        this.usuarios = usuarios; this.planos = planos; this.cronogramas = cronogramas; this.gerador = gerador;
    }
    private Long usuarioId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if(auth == null || !(auth.getPrincipal() instanceof SessaoAutenticada sessao)) throw new SessaoInvalidaException();
        return sessao.id();
    }
    @Transactional(readOnly = true)
    public Optional<CronogramaResponse> buscar() {
        Long usuario = usuarioId();
        var atuais = planos.findByUsuarioIdOrderByIdAsc(usuario);
        return cronogramas.findByUsuarioId(usuario).map(c -> CronogramaResponse.de(c, atuais));
    }
    @Transactional
    public CronogramaResponse gerar(GerarCronogramaRequest request) {
        var usuario = usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);
        // Agenda combinada: as disciplinas de todos os cursos inscritos dividem os mesmos horarios.
        var inscritos = planos.findByUsuarioIdOrderByIdAsc(usuario.getId());
        if (inscritos.isEmpty()) throw new ErroDePlanoException("plano", "Gere e salve seu plano semanal antes de criar o cronograma.");
        var entradas = inscritos.stream().flatMap(plano -> plano.getDisciplinas().stream()).map(d -> {
            var todos = d.getDisciplina().getConteudos();
            var pais = new HashSet<>(todos.stream().filter(c -> c.getPai() != null).map(c -> c.getPai().getId()).toList());
            var folhas = todos.stream().filter(c -> !pais.contains(c.getId())).sorted(Comparator.comparing(c -> c.getId())).map(c -> c.getId()).toList();
            return new GeradorCronograma.DisciplinaEntrada(d.getDisciplina().getId(), d.getMinutos(), folhas);
        }).toList();
        var resultado = gerador.gerar(request.semanaInicio(), request.disponibilidades(), entradas);
        var cronograma = cronogramas.findByUsuarioId(usuario.getId()).orElseGet(() -> new CronogramaEstudo(usuario));
        cronograma.atualizar(inscritos, request.semanaInicio(), resultado);
        cronogramas.saveAndFlush(cronograma);
        return CronogramaResponse.de(cronograma, inscritos);
    }
}
