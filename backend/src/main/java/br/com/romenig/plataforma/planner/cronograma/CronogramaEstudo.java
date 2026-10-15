package br.com.romenig.plataforma.planner.cronograma;

import java.time.*;
import java.util.*;
import jakarta.persistence.*;
import br.com.romenig.plataforma.edital.*;
import br.com.romenig.plataforma.planner.PlanoEstudo;
import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Agenda semanal do aluno. E unica por aluno e combina todos os cursos em que
 * ele esta inscrito; {@link CronogramaPlano} registra quais planos a geraram.
 */
@Entity @Table(name = "cronograma_estudo")
public class CronogramaEstudo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "usuario_id", unique = true) private Usuario usuario;
    @Column(name = "semana_inicio", nullable = false) private LocalDate semanaInicio;
    @Column(name = "meta_horas_semanais", nullable = false) private int metaHorasSemanais;
    @Column(name = "gerado_em", nullable = false) private OffsetDateTime geradoEm;
    @OneToMany(mappedBy = "cronograma", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CronogramaPlano> planos = new ArrayList<>();
    @OneToMany(mappedBy = "cronograma", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DisponibilidadeEstudo> disponibilidades = new ArrayList<>();
    @OneToMany(mappedBy = "cronograma", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AtividadeEstudo> atividades = new ArrayList<>();
    protected CronogramaEstudo() { }
    public CronogramaEstudo(Usuario usuario) { this.usuario = usuario; }

    public void atualizar(List<PlanoEstudo> origem, LocalDate semana, GeradorCronograma.Resultado resultado) {
        this.semanaInicio = semana; this.geradoEm = OffsetDateTime.now();
        this.metaHorasSemanais = origem.stream().mapToInt(PlanoEstudo::getMetaHorasSemanais).sum();
        disponibilidades.clear(); atividades.clear();
        // Atualiza os vinculos no lugar: apagar e recriar o mesmo plano violaria uk_cronograma_plano no flush.
        Set<Long> ids = new HashSet<>(origem.stream().map(PlanoEstudo::getId).toList());
        planos.removeIf(p -> !ids.contains(p.getPlano().getId()));
        planos.forEach(CronogramaPlano::renovar);
        origem.stream().filter(p -> !incluiPlano(p.getId())).forEach(p -> planos.add(new CronogramaPlano(this, p)));
        resultado.periodos().forEach(p -> disponibilidades.add(new DisponibilidadeEstudo(this, p)));
        Map<Long, Disciplina> disciplinas = new HashMap<>();
        Map<Long, Conteudo> conteudos = new HashMap<>();
        origem.forEach(p -> p.getEdital().getDisciplinas().forEach(d -> {
            disciplinas.put(d.getId(), d);
            d.getConteudos().forEach(c -> conteudos.put(c.getId(), c));
        }));
        resultado.sessoes().forEach(s -> atividades.add(new AtividadeEstudo(this, s, disciplinas.get(s.disciplinaId()), conteudos.get(s.conteudoId()))));
    }

    /**
     * Tira um curso cancelado da agenda: some o vinculo com o plano e as
     * atividades das disciplinas daquele edital; o restante continua valido.
     */
    public void removerCurso(PlanoEstudo plano) {
        Long editalId = plano.getEdital().getId();
        planos.removeIf(p -> p.getPlano().getId().equals(plano.getId()));
        atividades.removeIf(a -> a.getDisciplina().getEdital().getId().equals(editalId));
        metaHorasSemanais = planos.stream().mapToInt(p -> p.getPlano().getMetaHorasSemanais()).sum();
    }

    public boolean incluiPlano(Long planoId) { return planos.stream().anyMatch(p -> p.getPlano().getId().equals(planoId)); }
    public boolean semCursos() { return planos.isEmpty(); }

    /** Desatualizado quando um plano mudou ou o aluno entrou em curso que nao estava na agenda. */
    public boolean isDesatualizado(List<PlanoEstudo> atuais) {
        Set<Long> gerados = new HashSet<>(planos.stream().map(p -> p.getPlano().getId()).toList());
        Set<Long> inscritos = new HashSet<>(atuais.stream().map(PlanoEstudo::getId).toList());
        return !gerados.equals(inscritos) || planos.stream().anyMatch(CronogramaPlano::desatualizado);
    }

    public Long getId() { return id; }
    public LocalDate getSemanaInicio() { return semanaInicio; }
    public int getMetaHorasSemanais() { return metaHorasSemanais; }
    public OffsetDateTime getGeradoEm() { return geradoEm; }
    public List<PlanoEstudo> getPlanos() { return planos.stream().map(CronogramaPlano::getPlano).toList(); }
    public List<DisponibilidadeEstudo> getDisponibilidades() { return disponibilidades; }
    public List<AtividadeEstudo> getAtividades() { return atividades; }
}
