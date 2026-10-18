package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Edital aprovado - a base do planner (HU07, criterio 3).
 *
 * <p>Apenas a importacao aprovada cria edital: esta tabela nunca recebe valor
 * fora do fluxo revisao/aprovacao. {@code titulo + orgao + ano} sao unicos
 * ({@code uk_edital_titulo_orgao_ano}) - a segunda metade da deduplicacao,
 * no momento da aprovacao. O {@link EditalPdf} original fica referenciado por
 * {@code edital_pdf_id} para consulta futura.
 */
@Entity
@Table(name = "edital", uniqueConstraints = {
        @UniqueConstraint(name = "uk_edital_titulo_orgao_ano", columnNames = {"titulo", "orgao", "ano"})
})
public class Edital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String titulo;

    @Column(nullable = false, length = 120)
    private String orgao;

    @Column(nullable = false)
    private Integer ano;

    @OneToOne(fetch = FetchType.EAGER, optional = true)
    @JoinColumn(name = "edital_pdf_id")
    private EditalPdf pdf;

    /** Sigla da capa do card; nula nos editais antigos ate o admin salvar uma. */
    @Column(length = SiglaDoOrgao.TAMANHO_MAXIMO)
    private String sigla;

    @Column(name = "material_pdf_url", columnDefinition = "TEXT")
    private String materialPdfUrl;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @OneToMany(mappedBy = "edital", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Concurso> concursos = new ArrayList<>();

    @OneToMany(mappedBy = "edital", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Disciplina> disciplinas = new ArrayList<>();

    protected Edital() {
        // exigido pelo JPA
    }

    public Edital(String titulo, String orgao, Integer ano, EditalPdf pdf, OffsetDateTime criadoEm) {
        this.titulo = titulo;
        this.orgao = orgao;
        this.ano = ano;
        this.pdf = pdf;
        this.criadoEm = criadoEm;
        this.sigla = SiglaDoOrgao.gerar(orgao);
    }

    /** Edicao do admin: nome e sigla do orgao exibidos nos cards do curso. */
    public void atualizarOrgao(String orgao, String sigla) {
        this.orgao = orgao;
        this.sigla = sigla;
    }

    public void adicionarConcurso(Concurso concurso) {
        concursos.add(concurso);
    }

    public void adicionarDisciplina(Disciplina disciplina) {
        disciplinas.add(disciplina);
    }

    /** Edicao da estrutura pelo admin: a disciplina sai por orphanRemoval. */
    public void removerDisciplina(Disciplina disciplina) {
        disciplinas.remove(disciplina);
    }

    public Long getId() {
        return id;
    }

    public String getTitulo() {
        return titulo;
    }

    public String getOrgao() {
        return orgao;
    }

    /** Sigla salva ou, nos editais antigos, a calculada a partir do orgao. */
    public String getSigla() {
        return sigla == null || sigla.isBlank() ? SiglaDoOrgao.gerar(orgao) : sigla;
    }

    public Integer getAno() {
        return ano;
    }

    public EditalPdf getPdf() {
        return pdf;
    }

    public String getMaterialPdfUrl() {
        return materialPdfUrl;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public List<Concurso> getConcursos() {
        return concursos;
    }

    public List<Disciplina> getDisciplinas() {
        return disciplinas;
    }
}
