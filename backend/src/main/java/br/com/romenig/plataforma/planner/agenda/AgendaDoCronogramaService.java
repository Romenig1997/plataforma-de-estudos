package br.com.romenig.plataforma.planner.agenda;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.romenig.plataforma.autenticacao.SessaoAutenticada;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.planner.cronograma.CronogramaResponse;
import br.com.romenig.plataforma.planner.cronograma.CronogramaService;

/**
 * Cronograma na agenda do celular (HU18).
 *
 * <p>Cada aluno tem um link secreto ({@code /api/agenda/{token}.ics}) que o
 * Google Agenda, o Outlook ou o calendario do celular assinam. Esses apps nao
 * enviam o token de login, por isso o proprio link e a credencial: 256 bits
 * aleatorios, guardados numa tabela fechada para a Data API. Gerar um novo
 * link invalida o anterior.
 *
 * <p>O calendario e montado na hora a partir do cronograma atual, entao
 * qualquer mudanca na plataforma aparece na proxima sincronizacao do app.
 */
@Service
public class AgendaDoCronogramaService {

    private static final SecureRandom SORTEIO = new SecureRandom();

    private final JdbcTemplate jdbc;
    private final CronogramaService cronogramas;
    private final CalendarioIcs ics;
    private final Clock relogio;

    public AgendaDoCronogramaService(JdbcTemplate jdbc, CronogramaService cronogramas, CalendarioIcs ics, Clock relogio) {
        this.jdbc = jdbc;
        this.cronogramas = cronogramas;
        this.ics = ics;
        this.relogio = relogio;
    }

    /** Token da agenda do aluno logado; cria na primeira vez. */
    @Transactional
    public String tokenDaAgenda() {
        Long usuario = usuarioLogado();
        return tokenDe(usuario).orElseGet(() -> {
            String token = novoToken();
            jdbc.update("INSERT INTO agenda_do_cronograma (usuario_id, token, criado_em) VALUES (?, ?, ?)",
                    usuario, token, OffsetDateTime.now(relogio));
            return token;
        });
    }

    /** Troca o link: o anterior deixa de funcionar imediatamente. */
    @Transactional
    public String trocarToken() {
        Long usuario = usuarioLogado();
        String token = novoToken();
        if (tokenDe(usuario).isPresent()) {
            jdbc.update("UPDATE agenda_do_cronograma SET token = ?, criado_em = ? WHERE usuario_id = ?",
                    token, OffsetDateTime.now(relogio), usuario);
        } else {
            jdbc.update("INSERT INTO agenda_do_cronograma (usuario_id, token, criado_em) VALUES (?, ?, ?)",
                    usuario, token, OffsetDateTime.now(relogio));
        }
        return token;
    }

    /** Calendario .ics do dono do token, ou vazio se o link nao existe. */
    @Transactional
    public Optional<String> calendario(String token) {
        List<Long> donos = jdbc.queryForList("SELECT usuario_id FROM agenda_do_cronograma WHERE token = ?", Long.class, token);
        if (donos.isEmpty()) {
            return Optional.empty();
        }
        Optional<CronogramaResponse> cronograma = cronogramas.buscarDe(donos.get(0));
        return Optional.of(ics.gerar(cronograma.orElse(null)));
    }

    private Optional<String> tokenDe(Long usuario) {
        return jdbc.queryForList("SELECT token FROM agenda_do_cronograma WHERE usuario_id = ?", String.class, usuario)
                .stream().findFirst();
    }

    private static String novoToken() {
        byte[] bytes = new byte[32];
        SORTEIO.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private Long usuarioLogado() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !(autenticacao.getPrincipal() instanceof SessaoAutenticada sessao)) {
            throw new SessaoInvalidaException();
        }
        return sessao.id();
    }
}
