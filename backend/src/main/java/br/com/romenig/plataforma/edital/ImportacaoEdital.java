package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import br.com.romenig.plataforma.usuario.Usuario;

/**
 * Importacao de um edital em PDF (HU07, incremento A).
 *
 * <p>Registra o ciclo completo: o {@link EditalPdf} carregado, o texto
 * extraido e organizado pela IA ({@code conteudo_extraido}, JSON conforme
 * {@code EditalExtraido}), os erros da validacao manual
 * ({@code erros_validacao}, lista de {@code ErroValidacao}) e o destino da
 * revisao. Nada cai nas tabelas de {@link Edital} antes da aprovacao manual.
 */
@Entity
@Table(name = "importacao_edital")
public class ImportacaoEdital {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "edital_pdf_id", nullable = false)
    private EditalPdf pdf;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private StatusDeImportacao status;

    @Column(name = "total_paginas", nullable = false)
    private Integer totalPaginas;

    @Column(name = "conteudo_extraido", nullable = false)
    private String conteudoExtraido;

    @Column(name = "erros_validacao")
    private String errosValidacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "edital_aprovado_id")
    private Edital editalAprovado;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "importado_por_usuario_id", nullable = false)
    private Usuario importadoPor;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em")
    private OffsetDateTime atualizadoEm;

    protected ImportacaoEdital() {
        // exigido pelo JPA
    }

    public ImportacaoEdital(EditalPdf pdf, Integer totalPaginas,
                            String conteudoExtraido, Usuario importadoPor, OffsetDateTime agora) {
        this.pdf = pdf;
        this.totalPaginas = totalPaginas;
        this.conteudoExtraido = conteudoExtraido;
        this.importadoPor = importadoPor;
        this.criadoEm = agora;
        this.atualizadoEm = agora;
        this.status = StatusDeImportacao.AGUARDANDO_EXTRACAO;
    }

    public void marcarAguardandoRevisao() {
        this.status = StatusDeImportacao.AGUARDANDO_REVISAO;
    }

    public void marcarFalha() {
        this.status = StatusDeImportacao.FALHA;
    }

    public void marcarRejeitada() {
        this.status = StatusDeImportacao.REJEITADO;
    }

    public void aprovar(Edital edital) {
        this.status = StatusDeImportacao.APROVADO;
        this.editalAprovado = edital;
    }

    public void atualizar(OffsetDateTime agora) {
        this.atualizadoEm = agora;
    }

    public void definirConteudoExtraido(String conteudoExtraido, OffsetDateTime agora) {
        this.conteudoExtraido = conteudoExtraido;
        this.atualizadoEm = agora;
    }

    public void definirErrosValidacao(String errosValidacao, OffsetDateTime agora) {
        this.errosValidacao = errosValidacao;
        this.atualizadoEm = agora;
    }

    public Long getId() {
        return id;
    }

    public EditalPdf getPdf() {
        return pdf;
    }

    public StatusDeImportacao getStatus() {
        return status;
    }

    public Integer getTotalPaginas() {
        return totalPaginas;
    }

    public String getConteudoExtraido() {
        return conteudoExtraido;
    }

    public String getErrosValidacao() {
        return errosValidacao;
    }

    public Edital getEditalAprovado() {
        return editalAprovado;
    }

    public Usuario getImportadoPor() {
        return importadoPor;
    }

    public OffsetDateTime getCriadoEm() {
        return criadoEm;
    }

    public OffsetDateTime getAtualizadoEm() {
        return atualizadoEm;
    }
}