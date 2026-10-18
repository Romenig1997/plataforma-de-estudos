package br.com.romenig.plataforma.admin;

import java.time.OffsetDateTime;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.admin.dto.ResumoAdminResponse;
import br.com.romenig.plataforma.admin.dto.UsuarioAdminResponse;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.edital.EditalRepository;
import br.com.romenig.plataforma.edital.ImportacaoEditalRepository;
import br.com.romenig.plataforma.edital.StatusDeImportacao;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
import br.com.romenig.plataforma.planner.PlanoRepository;
import br.com.romenig.plataforma.questao.QuestaoRepository;
import br.com.romenig.plataforma.usuario.Perfil;
import br.com.romenig.plataforma.usuario.PerfilRepository;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;

/**
 * Area administrativa da HU04.
 *
 * <p>So e chamado em {@code /api/admin/**}, rota que o
 * {@code SecurityFilterChain} restringe a quem tem a authority {@code ADMIN}
 * (perfil gravado no banco e refletido no token — ver copia no
 * {@code FiltroDeTokenJwt}). O ALUNO recebe 403 do
 * {@code ErroDeAutenticacaoHandler} antes de chegar aqui.
 *
 * <p>Ao listar usuarios, a resposta e montada no DTO na mao: o
 * {@code senha_hash} da entidade jamais atravessa a serializacao.
 */
@Service
public class AdminService {

    private final UsuarioRepository usuarios;
    private final PerfilRepository perfis;
    private final EditalRepository editais;
    private final ImportacaoEditalRepository importacoes;
    private final QuestaoRepository questoes;
    private final PlanoRepository planos;

    public AdminService(UsuarioRepository usuarios, PerfilRepository perfis, EditalRepository editais,
                        ImportacaoEditalRepository importacoes, QuestaoRepository questoes, PlanoRepository planos) {
        this.usuarios = usuarios;
        this.perfis = perfis;
        this.editais = editais;
        this.importacoes = importacoes;
        this.questoes = questoes;
        this.planos = planos;
    }

    @Transactional(readOnly = true)
    public List<UsuarioAdminResponse> listarUsuarios() {
        return usuarios.findAll().stream()
                .map(UsuarioAdminResponse::de)
                .toList();
    }

    /** Contagens da visao geral e numeros de cada curso publicado. */
    @Transactional(readOnly = true)
    public ResumoAdminResponse resumo() {
        List<ResumoAdminResponse.Curso> cursos = editais.findAllByOrderByTituloAsc().stream()
                .map(edital -> new ResumoAdminResponse.Curso(
                        edital.getId(), edital.getTitulo(), edital.getSigla(),
                        planos.countByEdital_Id(edital.getId()),
                        questoes.countByEdital_IdAndPublicada(edital.getId(), true),
                        questoes.countByEdital_IdAndPublicada(edital.getId(), false)))
                .toList();
        List<ResumoAdminResponse.CadastroRecente> recentes = usuarios.findTop5ByCriadoEmNotNullOrderByCriadoEmDesc().stream()
                .map(usuario -> new ResumoAdminResponse.CadastroRecente(
                        usuario.getId(), usuario.getNome(), usuario.getPerfil(), usuario.getCriadoEm()))
                .toList();
        return new ResumoAdminResponse(
                usuarios.countByPerfil_Nome(Perfil.ALUNO),
                usuarios.countByPerfil_Nome(Perfil.ADMIN),
                usuarios.countByPerfil_NomeAndCriadoEmGreaterThanEqual(Perfil.ALUNO, OffsetDateTime.now().minusDays(30)),
                usuarios.countByEmailVerificadoFalse(),
                cursos.size(),
                importacoes.countByStatus(StatusDeImportacao.AGUARDANDO_REVISAO),
                questoes.countByPublicada(true),
                questoes.countByPublicada(false),
                cursos,
                recentes);
    }

    /**
     * Troca o perfil de uma conta. O admin nao altera o proprio perfil: assim
     * a plataforma nunca fica sem administrador por engano. A conta alterada
     * precisa entrar de novo, porque o perfil antigo estava no token.
     */
    @Transactional
    public UsuarioAdminResponse alterarPerfil(Long usuarioId, String nomeDoPerfil) {
        if (usuarioId.equals(usuarioLogado())) {
            throw new ErroDePlanoException("perfil", "Você não pode alterar o seu próprio perfil de acesso.");
        }
        Perfil perfil = perfis.findByNome(nomeDoPerfil)
                .orElseThrow(() -> new ErroDePlanoException("perfil", "Escolha o perfil ADMIN ou ALUNO."));
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ErroDePlanoException("usuario", "Usuário não encontrado."));
        usuario.alterarPerfil(perfil);
        return UsuarioAdminResponse.de(usuario);
    }

    private Long usuarioLogado() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            throw new SessaoInvalidaException();
        }
        return sessao.id();
    }
}
