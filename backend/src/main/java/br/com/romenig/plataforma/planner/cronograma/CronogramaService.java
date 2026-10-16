package br.com.romenig.plataforma.planner.cronograma;

import java.util.*;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.planner.*;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.dashboard.RegistroRepository;
import br.com.romenig.plataforma.dashboard.RegistroEstudo;

@Service
public class CronogramaService {
    private final UsuarioRepository usuarios;
    private final PlanoRepository planos;
    private final CronogramaRepository cronogramas;
    private final GeradorCronograma gerador;
    private final RegistroRepository registros;
    public CronogramaService(UsuarioRepository usuarios, PlanoRepository planos, CronogramaRepository cronogramas, GeradorCronograma gerador, RegistroRepository registros) {
        this.usuarios = usuarios; this.planos = planos; this.cronogramas = cronogramas; this.gerador = gerador; this.registros = registros;
    }
    /** Topicos que o aluno marcou como concluidos (mesma fonte do progresso do curso). */
    private Set<Long> concluidos(Long usuario) {
        Set<Long> ids = new HashSet<>();
        registros.findByUsuarioId(usuario).stream().filter(RegistroEstudo::isConcluido).forEach(r -> ids.add(r.getConteudoId()));
        return ids;
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
        return cronogramas.findByUsuarioId(usuario).map(c -> CronogramaResponse.de(c, atuais, concluidos(usuario)));
    }
    @Transactional
    public CronogramaResponse gerar(GerarCronogramaRequest request) {
        var usuario = usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);
        // Agenda combinada: as disciplinas de todos os cursos inscritos dividem os mesmos horarios.
        var inscritos = planos.findByUsuarioIdOrderByIdAsc(usuario.getId());
        if (inscritos.isEmpty()) throw new ErroDePlanoException("plano", "Gere e salve seu plano semanal antes de criar o cronograma.");
        return salvar(usuario, inscritos, request.semanaInicio(), request.disponibilidades());
    }

    /**
     * Cria ou atualiza a agenda ao se inscrever em um curso. A primeira agenda
     * nasce preenchida com horários padrão; eles continuam editáveis pelo aluno
     * na tela de cronograma.
     */
    @Transactional
    public void sincronizarAposInscricao(Usuario usuario, List<PlanoEstudo> inscritos) {
        if (inscritos.isEmpty()) return;
        int metaEmMinutos = inscritos.stream().mapToInt(PlanoEstudo::getMetaHorasSemanais).sum() * 60;
        var existente = cronogramas.findByUsuarioId(usuario.getId());
        var periodosAtuais = existente.map(CronogramaEstudo::getDisponibilidades)
                .orElseGet(List::of).stream()
                .map(d -> new GerarCronogramaRequest.PeriodoDisponivel(d.getDiaSemana(), d.getInicio(), d.getFim()))
                .toList();
        int minutosAtuais = periodosAtuais.stream()
                .mapToInt(p -> (int) java.time.Duration.between(p.inicio(), p.fim()).toMinutes())
                .sum();
        var periodos = minutosAtuais >= metaEmMinutos && !periodosAtuais.isEmpty()
                ? periodosAtuais
                : disponibilidadePadrao(metaEmMinutos);
        LocalDate semana = existente.map(CronogramaEstudo::getSemanaInicio)
                .orElseGet(CronogramaService::segundaDaSemanaAtual);
        salvar(usuario, inscritos, semana, periodos);
    }

    private CronogramaResponse salvar(Usuario usuario, List<PlanoEstudo> inscritos, LocalDate semana,
                                      List<GerarCronogramaRequest.PeriodoDisponivel> disponibilidades) {
        var resultado = gerador.gerar(semana, disponibilidades, entradas(inscritos));
        var cronograma = cronogramas.findByUsuarioId(usuario.getId()).orElseGet(() -> new CronogramaEstudo(usuario));
        cronograma.atualizar(inscritos, semana, resultado);
        cronogramas.saveAndFlush(cronograma);
        return CronogramaResponse.de(cronograma, inscritos, concluidos(usuario.getId()));
    }

    private List<GeradorCronograma.DisciplinaEntrada> entradas(List<PlanoEstudo> inscritos) {
        return inscritos.stream().flatMap(plano -> plano.getDisciplinas().stream()).map(d -> {
            var todos = d.getDisciplina().getConteudos();
            var pais = new HashSet<>(todos.stream().filter(c -> c.getPai() != null).map(c -> c.getPai().getId()).toList());
            var folhas = todos.stream().filter(c -> !pais.contains(c.getId())).sorted(Comparator.comparing(c -> c.getId())).map(c -> c.getId()).toList();
            return new GeradorCronograma.DisciplinaEntrada(d.getDisciplina().getId(), d.getMinutos(), folhas);
        }).toList();
    }

    /** Horários iniciais: noites úteis para metas até 15h; expediente para metas maiores. */
    private static List<GerarCronogramaRequest.PeriodoDisponivel> disponibilidadePadrao(int minutosNecessarios) {
        int dias = minutosNecessarios <= 40 * 60 ? 5 : 7;
        int restantes = minutosNecessarios;
        var periodos = new ArrayList<GerarCronogramaRequest.PeriodoDisponivel>();
        for (int dia = 1; dia <= dias && restantes > 0; dia++) {
            int diasRestantes = dias - dia + 1;
            int duracao = (int) Math.ceil((double) restantes / diasRestantes);
            LocalTime inicio = minutosNecessarios <= 15 * 60
                    ? LocalTime.of(21, 0).minusMinutes(duracao)
                    : LocalTime.of(8, 0);
            periodos.add(new GerarCronogramaRequest.PeriodoDisponivel(dia, inicio, inicio.plusMinutes(duracao)));
            restantes -= duracao;
        }
        if (restantes > 0) {
            throw new ErroDePlanoException("plano", "A meta semanal é maior que a disponibilidade automática. Ajuste a meta no planner.");
        }
        return List.copyOf(periodos);
    }

    private static LocalDate segundaDaSemanaAtual() {
        LocalDate hoje = LocalDate.now();
        return hoje.minusDays(hoje.getDayOfWeek().getValue() - DayOfWeek.MONDAY.getValue());
    }
}
