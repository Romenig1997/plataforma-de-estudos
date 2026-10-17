package br.com.romenig.plataforma.edital;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.romenig.plataforma.edital.dto.EditalResponse;
import br.com.romenig.plataforma.edital.dto.OrgaoDoCursoRequest;
import br.com.romenig.plataforma.perfil.foto.NormalizadorFoto;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
import jakarta.validation.Valid;

/**
 * Gestao dos cursos (editais aprovados) - area exclusiva do ADMIN (regra em
 * {@code /api/admin/**}).
 *
 * <p>A exclusao pelo id do edital cobre os cursos que nao tem importacao
 * ligada; os demais tambem podem sair por aqui. O id aceita so digitos para
 * nao disputar caminho com {@code /api/admin/editais/importacoes}. Aqui tambem
 * o admin troca o banner do card e edita o nome e a sigla do orgao.
 */
@RestController
@RequestMapping("/api/admin/editais")
public class ControleDeEditaisAdmin {

    private final ImportacaoDeEditalService servico;
    private final CapaDoCursoService capas;

    public ControleDeEditaisAdmin(ImportacaoDeEditalService servico, CapaDoCursoService capas) {
        this.servico = servico;
        this.capas = capas;
    }

    @DeleteMapping("/{editalId:\\d+}")
    public ResponseEntity<Void> excluir(@PathVariable Long editalId) {
        servico.excluirEdital(editalId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(path = "/{editalId:\\d+}/banner", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Long> salvarBanner(@PathVariable Long editalId, @RequestPart("arquivo") MultipartFile arquivo) {
        if (arquivo.getSize() > NormalizadorFoto.LIMITE_BYTES) {
            throw new ErroDePlanoException("banner", "Selecione uma imagem PNG ou JPEG de até 2 MB.");
        }
        try {
            return Map.of("bannerVersao", capas.salvarBanner(editalId, arquivo.getBytes()));
        } catch (IOException e) {
            throw new ErroDePlanoException("banner", "Não foi possível ler o arquivo enviado.");
        }
    }

    @DeleteMapping("/{editalId:\\d+}/banner")
    public ResponseEntity<Void> removerBanner(@PathVariable Long editalId) {
        capas.removerBanner(editalId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{editalId:\\d+}/orgao")
    public EditalResponse atualizarOrgao(@PathVariable Long editalId, @Valid @RequestBody OrgaoDoCursoRequest dados) {
        return EditalResponse.de(capas.atualizarOrgao(editalId, dados), capas.versoesDosBanners().get(editalId));
    }
}
