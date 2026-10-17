package br.com.romenig.plataforma.planner;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.dashboard.RegistroRepository;
import br.com.romenig.plataforma.edital.CapaDoCursoService;
import br.com.romenig.plataforma.edital.Edital;
import br.com.romenig.plataforma.edital.EditalRepository;
import br.com.romenig.plataforma.planner.cronograma.CronogramaRepository;
import br.com.romenig.plataforma.planner.cronograma.CronogramaService;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Planos de estudo, um por curso (edital) em que o aluno esta inscrito.
 *
 * <p>Invariante: quem tem plano tem exatamente um plano em foco. O foco e o
 * curso que as telas abrem quando a requisicao nao informa o edital.
 */
@Service
public class PlannerService {
    /** Meta usada na inscricao quando o perfil do aluno ainda nao tem uma. */
    static final int META_PADRAO = 10;

    private final UsuarioRepository usuarios;
    private final EditalRepository editais;
    private final PlanoRepository planos;
    private final CronogramaRepository cronogramas;
    private final CronogramaService cronogramaService;
    private final RegistroRepository registros;
    private final DistribuidorSemanal distribuidor;
    private final CapaDoCursoService capas;

    public PlannerService(UsuarioRepository usuarios, EditalRepository editais, PlanoRepository planos,
            CronogramaRepository cronogramas, CronogramaService cronogramaService,
            RegistroRepository registros, DistribuidorSemanal distribuidor, CapaDoCursoService capas) {
        this.usuarios = usuarios; this.editais = editais; this.planos = planos;
        this.cronogramas = cronogramas; this.cronogramaService = cronogramaService;
        this.registros = registros; this.distribuidor = distribuidor; this.capas = capas;
    }

    private Long usuarioId() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) throw new SessaoInvalidaException();
        return sessao.id();
    }

    /**
     * Plano do curso pedido ou, sem edital, o curso em foco. Usado tambem pelo
     * dashboard, pela analise e pelas questoes.
     */
    @Transactional(readOnly = true)
    public Optional<PlanoEstudo> selecionar(Long usuarioId, Long editalId) {
        return editalId != null ? planos.findByUsuarioIdAndEdital_Id(usuarioId, editalId) : planos.findFirstByUsuarioIdAndEmFocoTrue(usuarioId);
    }

    @Transactional(readOnly = true)
    public Optional<PlanoResponse> buscar(Long editalId) { return selecionar(usuarioId(), editalId).map(PlanoResponse::de); }

    /** Cria ou atualiza o plano do edital informado, inscrevendo o aluno se preciso. */
    @Transactional
    public PlanoResponse gerar(GerarPlanoRequest request) {
        var usuario = usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);
        var edital = editais.findById(request.editalId()).orElseThrow(() -> new ErroDePlanoException("editalId", "Selecione um edital aprovado."));
        var ids = new HashSet<>(edital.getDisciplinas().stream().map(d -> d.getId()).toList());
        if (ids.isEmpty()) throw new ErroDePlanoException("editalId", "O edital nao possui disciplinas para planejar.");
        Set<Long> escolhidas = new HashSet<>();
        for (var prioridade : request.prioridades()) {
            if (!ids.contains(prioridade.disciplinaId()) || !escolhidas.add(prioridade.disciplinaId()))
                throw new ErroDePlanoException("prioridades", "Informe uma prioridade para cada disciplina do edital, sem duplicidade.");
        }
        if (!escolhidas.equals(ids)) throw new ErroDePlanoException("prioridades", "Informe uma prioridade para todas as disciplinas do edital.");
        var parcelas = distribuidor.distribuir(request.metaHorasSemanais(), request.prioridades().stream()
                .map(p -> new DistribuidorSemanal.Entrada(p.disciplinaId(), p.prioridade())).toList());
        var plano = planoDoCurso(usuario, edital);
        plano.atualizar(edital, request.metaHorasSemanais(), parcelas);
        planos.saveAndFlush(plano);
        return PlanoResponse.de(plano);
    }

    @Transactional(readOnly = true)
    public List<InscricaoResponse> listar() {
        Long usuario = usuarioId();
        Set<Long> concluidos = new HashSet<>();
        registros.findByUsuarioId(usuario).forEach(r -> { if (r.isConcluido()) concluidos.add(r.getConteudoId()); });
        Map<Long, Long> versoes = capas.versoesDosBanners();
        return planos.findByUsuarioIdOrderByIdAsc(usuario).stream().map(p -> InscricaoResponse.de(p, concluidos, versoes)).toList();
    }

    /** Inscreve com a meta do perfil e todas as prioridades normais; idempotente. */
    @Transactional
    public PlanoResponse inscrever(Long editalId) {
        var usuario = usuarios.buscarParaPlanejar(usuarioId()).orElseThrow(SessaoInvalidaException::new);
        var existente = planos.findByUsuarioIdAndEdital_Id(usuario.getId(), editalId);
        if (existente.isPresent()) return PlanoResponse.de(existente.get());
        var edital = editais.findById(editalId).orElseThrow(() -> new ErroDePlanoException("editalId", "Selecione um edital aprovado."));
        if (edital.getDisciplinas().isEmpty()) throw new ErroDePlanoException("editalId", "O edital nao possui disciplinas para planejar.");
        int meta = usuario.getMetaEstudoSemanal() != null ? usuario.getMetaEstudoSemanal() : META_PADRAO;
        var parcelas = distribuidor.distribuir(meta, edital.getDisciplinas().stream()
                .map(d -> new DistribuidorSemanal.Entrada(d.getId(), Prioridade.NORMAL)).toList());
        var plano = planoDoCurso(usuario, edital);
        plano.atualizar(edital, meta, parcelas);
        planos.saveAndFlush(plano);
        cronogramaService.sincronizarAposInscricao(usuario,
                planos.findByUsuarioIdOrderByIdAsc(usuario.getId()));
        return PlanoResponse.de(plano);
    }

    /** Cancela a inscricao. Registros de estudo e respostas sao preservados. */
    @Transactional
    public void cancelar(Long editalId) {
        var plano = planos.findByUsuarioIdAndEdital_Id(usuarioId(), editalId)
                .orElseThrow(() -> new ErroDePlanoException("editalId", "Voce nao esta inscrito neste curso."));
        removerPlano(plano);
    }

    @Transactional
    public PlanoResponse definirFoco(Long editalId) {
        Long usuario = usuarioId();
        var alvo = planos.findByUsuarioIdAndEdital_Id(usuario, editalId)
                .orElseThrow(() -> new ErroDePlanoException("editalId", "Inscreva-se no curso antes de defini-lo como foco."));
        planos.findByUsuarioIdOrderByIdAsc(usuario).forEach(p -> p.definirFoco(p.getId().equals(alvo.getId())));
        planos.flush();
        return PlanoResponse.de(alvo);
    }

    /**
     * Remove o plano, tira o curso do cronograma e passa o foco adiante.
     * Tambem usado na exclusao de um edital pelo ADMIN.
     */
    @Transactional
    public void removerPlano(PlanoEstudo plano) {
        Long usuario = plano.getUsuario().getId();
        cronogramas.findByUsuarioId(usuario).ifPresent(cronograma -> {
            if (!cronograma.incluiPlano(plano.getId())) return;
            cronograma.removerCurso(plano);
            if (cronograma.semCursos()) cronogramas.delete(cronograma);
            cronogramas.flush();
        });
        boolean eraFoco = plano.isEmFoco();
        planos.delete(plano);
        planos.flush();
        if (eraFoco) {
            planos.findByUsuarioIdOrderByIdAsc(usuario).stream()
                    .max(Comparator.comparing(PlanoEstudo::getAtualizadoEm))
                    .ifPresent(p -> { p.definirFoco(true); planos.flush(); });
        }
    }

    /** Plano existente do curso ou um novo; o primeiro curso do aluno ja nasce em foco. */
    private PlanoEstudo planoDoCurso(Usuario usuario, Edital edital) {
        return planos.findByUsuarioIdAndEdital_Id(usuario.getId(), edital.getId()).orElseGet(() -> {
            var novo = new PlanoEstudo(usuario);
            novo.definirFoco(planos.findFirstByUsuarioIdAndEmFocoTrue(usuario.getId()).isEmpty());
            return novo;
        });
    }
}
