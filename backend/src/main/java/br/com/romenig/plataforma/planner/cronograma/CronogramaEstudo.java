package br.com.romenig.plataforma.planner.cronograma;

import java.time.*;
import java.util.*;
import jakarta.persistence.*;
import br.com.romenig.plataforma.edital.*;
import br.com.romenig.plataforma.planner.PlanoEstudo;
import br.com.romenig.plataforma.usuario.Usuario;

@Entity @Table(name = "cronograma_estudo")
public class CronogramaEstudo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "usuario_id", unique = true) private Usuario usuario;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "plano_id") private PlanoEstudo plano;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "edital_id") private Edital edital;
    @Column(name = "semana_inicio", nullable = false) private LocalDate semanaInicio;
    @Column(name = "meta_horas_semanais", nullable = false) private int metaHorasSemanais;
    @Column(name = "plano_atualizado_em", nullable = false) private OffsetDateTime planoAtualizadoEm;
    @Column(name = "gerado_em", nullable = false) private OffsetDateTime geradoEm;
    @OneToMany(mappedBy = "cronograma", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<DisponibilidadeEstudo> disponibilidades = new ArrayList<>();
    @OneToMany(mappedBy = "cronograma", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AtividadeEstudo> atividades = new ArrayList<>();
    protected CronogramaEstudo() { }
    public CronogramaEstudo(Usuario usuario) { this.usuario = usuario; }
    public void atualizar(PlanoEstudo plano, LocalDate semana, GeradorCronograma.Resultado resultado) {
        this.plano = plano; this.edital = plano.getEdital(); this.semanaInicio = semana;
        this.metaHorasSemanais = plano.getMetaHorasSemanais(); this.planoAtualizadoEm = plano.getAtualizadoEm(); this.geradoEm = OffsetDateTime.now();
        disponibilidades.clear(); atividades.clear();
        resultado.periodos().forEach(p -> disponibilidades.add(new DisponibilidadeEstudo(this, p)));
        Map<Long, Disciplina> disciplinas = new HashMap<>();
        Map<Long, Conteudo> conteudos = new HashMap<>();
        edital.getDisciplinas().forEach(d -> { disciplinas.put(d.getId(), d); d.getConteudos().forEach(c -> conteudos.put(c.getId(), c)); });
        resultado.sessoes().forEach(s -> atividades.add(new AtividadeEstudo(this, s, disciplinas.get(s.disciplinaId()), conteudos.get(s.conteudoId()))));
    }
    public Long getId() { return id; }
    public Edital getEdital() { return edital; }
    public LocalDate getSemanaInicio() { return semanaInicio; }
    public int getMetaHorasSemanais() { return metaHorasSemanais; }
    public OffsetDateTime getGeradoEm() { return geradoEm; }
    public boolean isDesatualizado() { return !planoAtualizadoEm.toInstant().equals(plano.getAtualizadoEm().toInstant()); }
    public List<DisponibilidadeEstudo> getDisponibilidades() { return disponibilidades; }
    public List<AtividadeEstudo> getAtividades() { return atividades; }
}
