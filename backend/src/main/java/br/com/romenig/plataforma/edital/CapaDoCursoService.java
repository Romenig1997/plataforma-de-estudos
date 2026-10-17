package br.com.romenig.plataforma.edital;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.edital.dto.OrgaoDoCursoRequest;
import br.com.romenig.plataforma.edital.exception.EditalDuplicadoException;
import br.com.romenig.plataforma.edital.exception.ImportacaoNaoEncontradaException;
import br.com.romenig.plataforma.perfil.foto.NormalizadorFoto;

/**
 * O que aparece na capa do card do curso: banner, nome e sigla do orgao.
 * Leitura do banner para qualquer pessoa; mudancas so pelo admin.
 */
@Service
public class CapaDoCursoService {

    private final EditalRepository editais;
    private final EditalBannerRepository banners;
    private final NormalizadorFoto normalizador;

    public CapaDoCursoService(EditalRepository editais, EditalBannerRepository banners, NormalizadorFoto normalizador) {
        this.editais = editais;
        this.banners = banners;
        this.normalizador = normalizador;
    }

    @Transactional(readOnly = true)
    public Optional<EditalBanner> buscarBanner(Long editalId) {
        return banners.findById(editalId);
    }

    /** Normaliza e guarda o banner, substituindo o anterior. Devolve a nova versao. */
    @Transactional
    public long salvarBanner(Long editalId, byte[] arquivo) {
        if (!editais.existsById(editalId)) throw new ImportacaoNaoEncontradaException();
        byte[] imagem = normalizador.normalizarBanner(arquivo);
        // Relogio do sistema: a versao precisa mudar a cada envio para o navegador buscar a imagem nova.
        EditalBanner banner = banners.saveAndFlush(new EditalBanner(editalId, imagem, OffsetDateTime.now()));
        return versao(banner.getAtualizadoEm());
    }

    @Transactional
    public void removerBanner(Long editalId) {
        if (!editais.existsById(editalId)) throw new ImportacaoNaoEncontradaException();
        banners.findById(editalId).ifPresent(banners::delete);
        banners.flush();
    }

    /** Versao do banner por edital, para as listagens de cursos. */
    @Transactional(readOnly = true)
    public Map<Long, Long> versoesDosBanners() {
        return banners.listarVersoes().stream()
                .collect(Collectors.toMap(VersaoDoBanner::editalId, v -> versao(v.atualizadoEm())));
    }

    @Transactional
    public Edital atualizarOrgao(Long editalId, OrgaoDoCursoRequest dados) {
        Edital edital = editais.findById(editalId).orElseThrow(ImportacaoNaoEncontradaException::new);
        String orgao = dados.orgao().trim();
        boolean mudouOrgao = !orgao.equals(edital.getOrgao());
        if (mudouOrgao && editais.existsByTituloAndOrgaoAndAno(edital.getTitulo(), orgao, edital.getAno())) {
            throw new EditalDuplicadoException("orgao", "Já existe um curso com esse título, órgão e ano.");
        }
        edital.atualizarOrgao(orgao, dados.sigla().trim());
        editais.flush();
        return edital;
    }

    private static long versao(OffsetDateTime atualizadoEm) {
        return atualizadoEm.toInstant().toEpochMilli();
    }
}
