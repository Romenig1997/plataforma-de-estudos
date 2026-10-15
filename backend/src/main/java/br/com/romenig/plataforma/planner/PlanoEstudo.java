package br.com.romenig.plataforma.planner;

import java.time.OffsetDateTime;
import java.util.*;
import jakarta.persistence.*;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.edital.Edital;
import br.com.romenig.plataforma.edital.Disciplina;

@Entity
@Table(name = "plano_estudo")
public class PlanoEstudo {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "usuario_id") private Usuario usuario;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "edital_id") private Edital edital;
    @Column(name = "meta_horas_semanais", nullable = false) private int metaHorasSemanais;
    @Column(name = "atualizado_em", nullable = false) private OffsetDateTime atualizadoEm;
    /** Curso que as telas abrem por padrao. O PlannerService mantem um unico foco por aluno. */
    @Column(name = "em_foco", nullable = false) private boolean emFoco;
    @OneToMany(mappedBy = "plano", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<PlanoDisciplina> disciplinas = new ArrayList<>();
    protected PlanoEstudo() { }
    public PlanoEstudo(Usuario usuario) { this.usuario = usuario; }

    public void definirFoco(boolean emFoco) { this.emFoco = emFoco; }

    public void atualizar(Edital edital, int horas, List<DistribuidorSemanal.Parcela> parcelas) {
        this.edital = edital; this.metaHorasSemanais = horas; this.atualizadoEm = OffsetDateTime.now();
        Map<Long, Disciplina> catalogo = new HashMap<>();
        edital.getDisciplinas().forEach(d -> catalogo.put(d.getId(), d));
        disciplinas.removeIf(d -> !catalogo.containsKey(d.getDisciplina().getId()));
        for (var parcela : parcelas) {
            var existente = disciplinas.stream().filter(d -> d.getDisciplina().getId().equals(parcela.disciplinaId())).findFirst();
            if (existente.isPresent()) existente.get().atualizar(parcela.prioridade(), parcela.minutos());
            else disciplinas.add(new PlanoDisciplina(this, catalogo.get(parcela.disciplinaId()), parcela.prioridade(), parcela.minutos()));
        }
    }
    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public boolean isEmFoco() { return emFoco; }
    public Edital getEdital() { return edital; }
    public int getMetaHorasSemanais() { return metaHorasSemanais; }
    public OffsetDateTime getAtualizadoEm() { return atualizadoEm; }
    public List<PlanoDisciplina> getDisciplinas() { return disciplinas; }
}
