package br.com.romenig.plataforma.edital;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.dashboard.RegistroRepository;
import br.com.romenig.plataforma.edital.dto.EditalResponse;
import br.com.romenig.plataforma.planner.DistribuidorSemanal;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
import br.com.romenig.plataforma.planner.PlanoDisciplina;
import br.com.romenig.plataforma.planner.PlanoEstudo;
import br.com.romenig.plataforma.planner.PlanoRepository;
import br.com.romenig.plataforma.planner.Prioridade;
import br.com.romenig.plataforma.planner.cronograma.CronogramaRepository;
import br.com.romenig.plataforma.questao.Questao;
import br.com.romenig.plataforma.questao.QuestaoRepository;
import br.com.romenig.plataforma.questao.RespostaQuestaoRepository;

/**
 * Edicao da estrutura de um curso ja publicado (disciplinas, assuntos e
 * subassuntos) pela area admin.
 *
 * <p>Excluir um item apaga o que depende dele: atividades do cronograma,
 * progresso dos alunos (registros de estudo) e questoes com as respostas.
 * Toda mudanca marca os planos dos inscritos como alterados, para o
 * cronograma aparecer desatualizado; incluir ou excluir disciplina tambem
 * redistribui o tempo semanal do plano, mantendo as prioridades escolhidas.
 *
 * <p>Os passos de exclusao fazem {@code flush} um a um: as chaves
 * estrangeiras (subassunto aponta para o assunto, plano para a disciplina)
 * exigem que os dependentes saiam antes.
 */
@Service
public class EstruturaDoCursoService {

    private final EditalRepository editais;
    private final CapaDoCursoService capas;
    private final PlanoRepository planos;
    private final CronogramaRepository cronogramas;
    private final QuestaoRepository questoes;
    private final RespostaQuestaoRepository respostas;
    private final RegistroRepository registros;
    private final DistribuidorSemanal distribuidor;

    public EstruturaDoCursoService(EditalRepository editais, CapaDoCursoService capas, PlanoRepository planos,
                                   CronogramaRepository cronogramas, QuestaoRepository questoes,
                                   RespostaQuestaoRepository respostas, RegistroRepository registros,
                                   DistribuidorSemanal distribuidor) {
        this.editais = editais;
        this.capas = capas;
        this.planos = planos;
        this.cronogramas = cronogramas;
        this.questoes = questoes;
        this.respostas = respostas;
        this.registros = registros;
        this.distribuidor = distribuidor;
    }

    @Transactional
    public EditalResponse adicionarDisciplina(Long editalId, String nome, String primeiroAssunto, Integer pagina) {
        Edital edital = curso(editalId);
        String nomeLimpo = nome.trim();
        exigirNomeLivre(edital, nomeLimpo, null);
        int paginaFinal = pagina != null ? pagina
                : edital.getDisciplinas().stream().map(Disciplina::getPagina).max(Integer::compare).orElse(1);
        Disciplina disciplina = new Disciplina(edital, nomeLimpo, paginaFinal);
        disciplina.adicionarConteudo(new Conteudo(null, primeiroAssunto.trim(), paginaFinal));
        edital.adicionarDisciplina(disciplina);
        editais.saveAndFlush(edital);
        redistribuirPlanos(edital);
        return resposta(edital);
    }

    @Transactional
    public EditalResponse renomearDisciplina(Long editalId, Long disciplinaId, String nome) {
        Edital edital = curso(editalId);
        Disciplina disciplina = disciplina(edital, disciplinaId);
        String nomeLimpo = nome.trim();
        if (nomeLimpo.length() > 255) throw new ErroDePlanoException("nome", "Use até 255 caracteres no nome da disciplina.");
        exigirNomeLivre(edital, nomeLimpo, disciplinaId);
        disciplina.renomear(nomeLimpo);
        editais.flush();
        return resposta(edital);
    }

    @Transactional
    public EditalResponse removerDisciplina(Long editalId, Long disciplinaId) {
        Edital edital = curso(editalId);
        Disciplina disciplina = disciplina(edital, disciplinaId);
        if (edital.getDisciplinas().size() == 1) {
            throw new ErroDePlanoException("disciplina", "O curso precisa ter ao menos uma disciplina.");
        }
        Set<Long> ids = new HashSet<>(disciplina.getConteudos().stream().map(Conteudo::getId).toList());
        removerDependentes(edital, ids);

        for (PlanoEstudo plano : planos.findByEdital_Id(editalId)) plano.removerDisciplina(disciplinaId);
        planos.flush();

        List<Conteudo> subassuntos = disciplina.getConteudos().stream().filter(c -> c.getPai() != null).toList();
        subassuntos.forEach(disciplina::removerConteudo);
        editais.flush();
        edital.removerDisciplina(disciplina);
        editais.flush();

        redistribuirPlanos(edital);
        return resposta(edital);
    }

    @Transactional
    public EditalResponse adicionarConteudo(Long editalId, Long disciplinaId, String nome, Long paiId, Integer pagina) {
        Edital edital = curso(editalId);
        Disciplina disciplina = disciplina(edital, disciplinaId);
        Conteudo pai = null;
        if (paiId != null) {
            pai = disciplina.getConteudos().stream().filter(c -> c.getId().equals(paiId)).findFirst()
                    .orElseThrow(() -> new ErroDePlanoException("paiId", "Assunto não encontrado nesta disciplina."));
            if (pai.getPai() != null) {
                throw new ErroDePlanoException("paiId", "Subassuntos só podem ficar dentro de um assunto.");
            }
        }
        int paginaFinal = pagina != null ? pagina : pai != null ? pai.getPagina() : disciplina.getPagina();
        disciplina.adicionarConteudo(new Conteudo(pai, nome.trim(), paginaFinal));
        editais.flush();
        marcarPlanos(editalId);
        return resposta(edital);
    }

    @Transactional
    public EditalResponse renomearConteudo(Long editalId, Long conteudoId, String nome) {
        Edital edital = curso(editalId);
        conteudo(edital, conteudoId).renomear(nome.trim());
        editais.flush();
        return resposta(edital);
    }

    @Transactional
    public EditalResponse removerConteudo(Long editalId, Long conteudoId) {
        Edital edital = curso(editalId);
        Conteudo alvo = conteudo(edital, conteudoId);
        Disciplina disciplina = edital.getDisciplinas().stream()
                .filter(d -> d.getConteudos().contains(alvo)).findFirst().orElseThrow();
        if (alvo.getPai() == null && disciplina.getConteudos().stream().filter(c -> c.getPai() == null).count() == 1) {
            throw new ErroDePlanoException("conteudo", "A disciplina precisa ter ao menos um assunto. Para tirá-la do curso, exclua a disciplina.");
        }
        List<Conteudo> filhos = disciplina.getConteudos().stream()
                .filter(c -> c.getPai() != null && c.getPai().getId().equals(conteudoId)).toList();
        Set<Long> ids = new HashSet<>(filhos.stream().map(Conteudo::getId).toList());
        ids.add(conteudoId);
        removerDependentes(edital, ids);

        filhos.forEach(disciplina::removerConteudo);
        editais.flush();
        disciplina.removerConteudo(alvo);
        editais.flush();

        marcarPlanos(editalId);
        return resposta(edital);
    }

    /** Atividades do cronograma, questoes (com respostas) e registros de estudo dos conteudos. */
    private void removerDependentes(Edital edital, Set<Long> conteudoIds) {
        if (conteudoIds.isEmpty()) return;
        for (PlanoEstudo plano : planos.findByEdital_Id(edital.getId())) {
            cronogramas.findByUsuarioId(plano.getUsuario().getId())
                    .ifPresent(cronograma -> cronograma.removerAtividadesDosConteudos(conteudoIds));
        }
        cronogramas.flush();

        for (Questao questao : questoes.findByConteudo_IdIn(conteudoIds)) {
            respostas.deleteAll(respostas.findByQuestao_Id(questao.getId()));
            questoes.delete(questao);
        }
        questoes.flush();

        registros.deleteAll(registros.findByConteudo_IdIn(conteudoIds));
        registros.flush();
    }

    /** Refaz a divisao do tempo semanal de cada inscrito com as disciplinas atuais. */
    private void redistribuirPlanos(Edital edital) {
        for (PlanoEstudo plano : planos.findByEdital_Id(edital.getId())) {
            Map<Long, Prioridade> escolhidas = new HashMap<>();
            for (PlanoDisciplina item : plano.getDisciplinas()) {
                escolhidas.put(item.getDisciplina().getId(), item.getPrioridade());
            }
            var entradas = edital.getDisciplinas().stream()
                    .map(d -> new DistribuidorSemanal.Entrada(d.getId(), escolhidas.getOrDefault(d.getId(), Prioridade.NORMAL)))
                    .toList();
            plano.atualizar(edital, plano.getMetaHorasSemanais(), distribuidor.distribuir(plano.getMetaHorasSemanais(), entradas));
        }
        planos.flush();
    }

    private void marcarPlanos(Long editalId) {
        planos.findByEdital_Id(editalId).forEach(PlanoEstudo::marcarAlterado);
        planos.flush();
    }

    private void exigirNomeLivre(Edital edital, String nome, Long ignorarId) {
        boolean repetido = edital.getDisciplinas().stream()
                .anyMatch(d -> !d.getId().equals(ignorarId) && d.getNome().equalsIgnoreCase(nome));
        if (repetido) throw new ErroDePlanoException("nome", "Já existe uma disciplina com esse nome neste curso.");
    }

    private Edital curso(Long editalId) {
        return editais.findById(editalId)
                .orElseThrow(() -> new ErroDePlanoException("edital", "Curso não encontrado."));
    }

    private static Disciplina disciplina(Edital edital, Long disciplinaId) {
        return edital.getDisciplinas().stream().filter(d -> d.getId().equals(disciplinaId)).findFirst()
                .orElseThrow(() -> new ErroDePlanoException("disciplina", "Disciplina não encontrada neste curso."));
    }

    private static Conteudo conteudo(Edital edital, Long conteudoId) {
        return edital.getDisciplinas().stream().flatMap(d -> d.getConteudos().stream())
                .filter(c -> c.getId().equals(conteudoId)).findFirst()
                .orElseThrow(() -> new ErroDePlanoException("conteudo", "Tópico não encontrado neste curso."));
    }

    private EditalResponse resposta(Edital edital) {
        return EditalResponse.de(edital, capas.versoesDosBanners().get(edital.getId()));
    }
}
