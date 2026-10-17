package br.com.romenig.plataforma.planner;

import java.time.OffsetDateTime;
import java.util.*;
import br.com.romenig.plataforma.dashboard.DashboardService;

/** Curso em que o aluno esta inscrito, com o progresso nos topicos finais. */
public record InscricaoResponse(Long editalId, String titulo, String orgao, String sigla, int ano, boolean emFoco,
        int metaHorasSemanais, OffsetDateTime atualizadoEm, int totalTopicos, int topicosConcluidos, double progresso, Long bannerVersao) {

    public static InscricaoResponse de(PlanoEstudo plano, Set<Long> conteudosConcluidos, Map<Long, Long> versoesDosBanners) {
        var edital = plano.getEdital();
        // Topicos finais: conteudos que nao sao grupo de outros (mesma regra do dashboard).
        Set<Long> pais = new HashSet<>();
        edital.getDisciplinas().forEach(d -> d.getConteudos().forEach(c -> { if (c.getPai() != null) pais.add(c.getPai().getId()); }));
        var finais = edital.getDisciplinas().stream().flatMap(d -> d.getConteudos().stream()).filter(c -> !pais.contains(c.getId())).toList();
        int concluidos = (int) finais.stream().filter(c -> conteudosConcluidos.contains(c.getId())).count();
        return new InscricaoResponse(edital.getId(), edital.getTitulo(), edital.getOrgao(), edital.getSigla(), edital.getAno(), plano.isEmFoco(),
                plano.getMetaHorasSemanais(), plano.getAtualizadoEm(), finais.size(), concluidos,
                DashboardService.percentual(concluidos, finais.size()), versoesDosBanners.get(edital.getId()));
    }
}
