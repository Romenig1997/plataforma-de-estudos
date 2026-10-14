package br.com.romenig.plataforma.planner;

import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.context.SecurityContextHolder;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
import br.com.romenig.plataforma.edital.EditalRepository;

@Service
public class PlannerService {
    private final UsuarioRepository usuarios;
    private final EditalRepository editais;
    private final PlanoRepository planos;
    private final DistribuidorSemanal distribuidor;
    public PlannerService(UsuarioRepository usuarios, EditalRepository editais, PlanoRepository planos, DistribuidorSemanal distribuidor) {
        this.usuarios = usuarios; this.editais = editais; this.planos = planos; this.distribuidor = distribuidor;
    }
    private Long usuarioId() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) throw new SessaoInvalidaException();
        return sessao.id();
    }
    @Transactional(readOnly = true)
    public Optional<PlanoResponse> buscar() { return planos.findByUsuarioId(usuarioId()).map(PlanoResponse::de); }

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
        var plano = planos.findByUsuarioId(usuario.getId()).orElseGet(() -> new PlanoEstudo(usuario));
        plano.atualizar(edital, request.metaHorasSemanais(), parcelas);
        planos.saveAndFlush(plano);
        return PlanoResponse.de(plano);
    }
}
