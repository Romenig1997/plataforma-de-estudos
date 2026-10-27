package br.com.romenig.plataforma.conta;

import java.time.Clock;
import java.time.OffsetDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.AutenticacaoService;
import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.perfil.foto.ArmazenamentoDeFotos;
import br.com.romenig.plataforma.planner.ErroDePlanoException;
import br.com.romenig.plataforma.usuario.Perfil;
import br.com.romenig.plataforma.usuario.Usuario;
import br.com.romenig.plataforma.usuario.UsuarioRepository;
import jakarta.persistence.EntityManager;

/**
 * Exclusao de conta: pelo administrador (HU15) ou pelo proprio aluno (HU16).
 *
 * <p>Apaga, em uma unica transacao, tudo o que pertence a conta: cronograma,
 * planos, aulas concluidas, respostas de questoes, foto, link da agenda, o
 * perfil e o login no Supabase Auth. Se qualquer passo falhar, nada e apagado.
 *
 * <p>Contas ADMIN nao sao excluidas por aqui: o perfil precisa voltar para
 * ALUNO antes (por outro administrador). Assim a plataforma nunca perde o
 * ultimo administrador por engano, e os editais importados por um admin
 * continuam com o autor registrado.
 */
@Service
public class ExclusaoDeContaService {

    private static final Logger LOG = LoggerFactory.getLogger(ExclusaoDeContaService.class);

    private final UsuarioRepository usuarios;
    private final JdbcTemplate jdbc;
    private final IdentidadesDoSupabase identidades;
    private final IdentidadesExcluidas excluidas;
    private final ArmazenamentoDeFotos fotos;
    private final Clock relogio;
    private final EntityManager entidades;

    public ExclusaoDeContaService(UsuarioRepository usuarios, JdbcTemplate jdbc, IdentidadesDoSupabase identidades,
                                  IdentidadesExcluidas excluidas, ArmazenamentoDeFotos fotos, Clock relogio,
                                  EntityManager entidades) {
        this.usuarios = usuarios;
        this.jdbc = jdbc;
        this.identidades = identidades;
        this.excluidas = excluidas;
        this.fotos = fotos;
        this.relogio = relogio;
        this.entidades = entidades;
    }

    /** HU15: o administrador exclui a conta de um aluno. */
    @Transactional
    public void excluirPeloAdmin(Long usuarioId) {
        if (usuarioId.equals(usuarioLogado())) {
            throw new ErroDePlanoException("usuario", "Para excluir a sua própria conta, use a opção no seu perfil.");
        }
        Usuario usuario = usuarios.findById(usuarioId)
                .orElseThrow(() -> new ErroDePlanoException("usuario", "Usuário não encontrado."));
        if (Perfil.ADMIN.equals(usuario.getPerfil())) {
            throw new ErroDePlanoException("usuario",
                    "Contas de administrador não podem ser excluídas. Altere o perfil para ALUNO antes.");
        }
        // A foto fica na pasta do aluno no Storage, que so ele pode apagar.
        excluir(usuario);
    }

    /** HU16: o aluno exclui a propria conta. */
    @Transactional
    public void excluirPropriaConta() {
        Usuario usuario = usuarios.findById(usuarioLogado()).orElseThrow(SessaoInvalidaException::new);
        if (Perfil.ADMIN.equals(usuario.getPerfil())) {
            throw new ErroDePlanoException("usuario",
                    "Administradores não podem excluir a própria conta. Peça a outro administrador para alterar seu perfil para ALUNO.");
        }
        if (usuario.getAvatarUrl() != null) {
            try {
                fotos.remover(usuario.getAvatarUrl(), AutenticacaoService.tokenDaSessao());
            } catch (RuntimeException falha) {
                LOG.warn("Foto da conta {} nao foi removida do Storage: {}", usuario.getId(), falha.getMessage());
            }
        }
        excluir(usuario);
    }

    private void excluir(Usuario usuario) {
        Long id = usuario.getId();
        // Grava o que estiver pendente antes de apagar por SQL; depois limpa o
        // contexto para nenhuma entidade em memoria apontar para linhas apagadas.
        entidades.flush();
        String cronogramas = "SELECT id FROM cronograma_estudo WHERE usuario_id = ?";
        String planos = "SELECT id FROM plano_estudo WHERE usuario_id = ?";
        jdbc.update("DELETE FROM atividade_estudo WHERE cronograma_id IN (" + cronogramas + ")", id);
        jdbc.update("DELETE FROM disponibilidade_estudo WHERE cronograma_id IN (" + cronogramas + ")", id);
        jdbc.update("DELETE FROM cronograma_plano WHERE cronograma_id IN (" + cronogramas + ") OR plano_id IN (" + planos + ")", id, id);
        jdbc.update("DELETE FROM cronograma_estudo WHERE usuario_id = ?", id);
        jdbc.update("DELETE FROM plano_disciplina WHERE plano_id IN (" + planos + ")", id);
        jdbc.update("DELETE FROM plano_estudo WHERE usuario_id = ?", id);
        jdbc.update("DELETE FROM registro_estudo WHERE usuario_id = ?", id);
        jdbc.update("DELETE FROM resposta_questao WHERE usuario_id = ?", id);
        jdbc.update("DELETE FROM foto_perfil WHERE usuario_id = ?", id);
        jdbc.update("DELETE FROM agenda_do_cronograma WHERE usuario_id = ?", id);
        jdbc.update("DELETE FROM usuario WHERE id = ?", id);
        entidades.clear();
        if (usuario.getAuthId() != null) {
            excluidas.registrar(usuario.getAuthId(), OffsetDateTime.now(relogio));
            identidades.remover(usuario.getAuthId());
        }
    }

    private Long usuarioLogado() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            throw new SessaoInvalidaException();
        }
        return sessao.id();
    }
}
