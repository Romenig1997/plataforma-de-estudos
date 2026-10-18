package br.com.romenig.plataforma.edital;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import br.com.romenig.plataforma.autenticacao.AutenticacaoService;
import br.com.romenig.plataforma.edital.armazenamento.ArmazenamentoDePdfs;
import br.com.romenig.plataforma.edital.dto.AcessoAoPdfResponse;
import br.com.romenig.plataforma.edital.dto.MigracaoDePdfsResponse;
import br.com.romenig.plataforma.edital.exception.PdfIndisponivelException;

/**
 * Conteudo dos PDFs de edital: grava os novos no Storage, le de onde estiver
 * (Storage ou bytea legado), gera o acesso do leitor e remove o arquivo
 * quando a linha sai do banco.
 *
 * <p>O bytea legado e lido por SQL direto, uma linha por vez, e somente aqui:
 * a entidade {@link EditalPdf} nao mapeia a coluna, para que listar cursos ou
 * importacoes nunca transfira o arquivo do Postgres.
 *
 * <p>Todas as chamadas ao Storage usam o token da sessao atual: o ADMIN grava
 * e apaga; o aluno so le PDFs de cursos publicados (politicas do bucket).
 */
@Component
public class ArquivosDePdf {

    private static final Logger LOG = LoggerFactory.getLogger(ArquivosDePdf.class);

    private final ArmazenamentoDePdfs armazenamento;
    private final JdbcTemplate jdbc;
    private final Clock relogio;
    private final Duration validadeDaUrl;

    public ArquivosDePdf(ArmazenamentoDePdfs armazenamento, JdbcTemplate jdbc, Clock relogio,
                         @Value("${plataforma.pdfs.validade-url-assinada:PT1H}") Duration validadeDaUrl) {
        this.armazenamento = armazenamento;
        this.jdbc = jdbc;
        this.relogio = relogio;
        this.validadeDaUrl = validadeDaUrl;
    }

    /** Caminho imutavel: o mesmo conteudo sempre cai no mesmo objeto. */
    public static String caminhoPara(String sha256) {
        return "editais/" + sha256 + ".pdf";
    }

    /** Grava um PDF novo no Storage e devolve o caminho para {@link EditalPdf}. */
    public String guardar(String sha256, byte[] conteudo) {
        String caminho = caminhoPara(sha256);
        armazenamento.enviar(caminho, conteudo, AutenticacaoService.tokenDaSessao());
        return caminho;
    }

    /** Conteudo completo, para reprocessar a importacao ou atender o endpoint legado. */
    public byte[] ler(EditalPdf pdf) {
        if (!pdf.isLegado()) {
            return armazenamento.baixar(pdf.getCaminhoStorage(), AutenticacaoService.tokenDaSessao());
        }
        return lerBytea(pdf.getId());
    }

    /** Como o leitor do curso abre o PDF: URL assinada ou fallback legado. */
    public AcessoAoPdfResponse acessar(EditalPdf pdf) {
        if (pdf.isLegado()) {
            return AcessoAoPdfResponse.legado();
        }
        OffsetDateTime expiraEm = OffsetDateTime.now(relogio).plus(validadeDaUrl);
        String url = armazenamento.assinar(pdf.getCaminhoStorage(), validadeDaUrl, AutenticacaoService.tokenDaSessao());
        return AcessoAoPdfResponse.storage(url, expiraEm);
    }

    /**
     * Apaga o arquivo do Storage depois que a exclusao da linha for confirmada.
     * Se a transacao for desfeita, o arquivo continua la e a linha tambem.
     */
    public void removerDepoisDoCommit(EditalPdf pdf) {
        if (pdf.isLegado()) {
            return;
        }
        String caminho = pdf.getCaminhoStorage();
        String token = AutenticacaoService.tokenDaSessao();
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            armazenamento.remover(caminho, token);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                armazenamento.remover(caminho, token);
            }
        });
    }

    /**
     * Copia os PDFs legados para o Storage, um por vez, sem apagar nada.
     *
     * <p>Para cada linha sem {@code caminho_storage}: le o bytea, confere o
     * SHA-256 com o registrado, envia para {@code editais/{sha256}.pdf}, baixa
     * de volta e confere de novo; so entao grava o caminho. O bytea continua
     * na linha (rollback trivial: {@code caminho_storage = NULL}). Limpar a
     * coluna e um passo manual separado (docs/08-pdfs-no-storage.md).
     */
    public MigracaoDePdfsResponse migrarLegados(int limite) {
        String token = AutenticacaoService.tokenDaSessao();
        List<Long> ids = jdbc.queryForList(
                "SELECT id FROM edital_pdf WHERE caminho_storage IS NULL AND bytes IS NOT NULL ORDER BY id",
                Long.class);
        int migrados = 0;
        List<Long> falhas = new ArrayList<>();
        for (Long id : ids.subList(0, Math.min(limite, ids.size()))) {
            try {
                String sha256 = jdbc.queryForObject("SELECT sha256 FROM edital_pdf WHERE id = ?", String.class, id);
                byte[] conteudo = lerBytea(id);
                if (!sha256(conteudo).equals(sha256)) {
                    throw new IllegalStateException("SHA-256 do bytea difere do registrado.");
                }
                String caminho = caminhoPara(sha256);
                armazenamento.enviar(caminho, conteudo, token);
                if (!sha256(armazenamento.baixar(caminho, token)).equals(sha256)) {
                    throw new IllegalStateException("Arquivo no Storage difere do bytea.");
                }
                jdbc.update("UPDATE edital_pdf SET caminho_storage = ? WHERE id = ? AND caminho_storage IS NULL", caminho, id);
                migrados++;
            } catch (RuntimeException falha) {
                LOG.warn("PDF legado {} nao foi migrado: {}", id, falha.getMessage());
                falhas.add(id);
            }
        }
        Long restantes = jdbc.queryForObject("SELECT COUNT(*) FROM edital_pdf WHERE caminho_storage IS NULL", Long.class);
        return new MigracaoDePdfsResponse(migrados, falhas, restantes == null ? 0 : restantes);
    }

    private byte[] lerBytea(Long id) {
        byte[] conteudo = jdbc.queryForObject("SELECT bytes FROM edital_pdf WHERE id = ?", byte[].class, id);
        if (conteudo == null) {
            throw new PdfIndisponivelException(new IllegalStateException("PDF " + id + " sem conteudo."));
        }
        return conteudo;
    }

    static String sha256(byte[] conteudo) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(conteudo));
        } catch (NoSuchAlgorithmException excecao) {
            throw new IllegalStateException("SHA-256 indisponivel na JVM.", excecao);
        }
    }
}
