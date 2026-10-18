package br.com.romenig.plataforma.autenticacao;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.autenticacao.dto.SessaoAtualResponse;

/**
 * Sessao atual (HU02).
 *
 * <p>{@code GET /api/auth/me} exige {@code Authorization: Bearer <access token
 * do Supabase>}. Nao ha endpoint de login, cadastro ou logout: esses fluxos
 * sao do Supabase Auth, e o logout encerra a sessao no proprio Supabase.
 */
@RestController
@RequestMapping("/api/auth")
public class AutenticacaoController {

    private final AutenticacaoService autenticacao;

    public AutenticacaoController(AutenticacaoService autenticacao) {
        this.autenticacao = autenticacao;
    }

    @GetMapping("/me")
    public SessaoAtualResponse sessaoAtual() {
        return autenticacao.sessaoAtual();
    }
}
