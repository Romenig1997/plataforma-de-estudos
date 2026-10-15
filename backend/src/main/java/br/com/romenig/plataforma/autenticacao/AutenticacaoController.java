package br.com.romenig.plataforma.autenticacao;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.time.Duration;
import jakarta.servlet.http.HttpServletRequest;

import br.com.romenig.plataforma.autenticacao.dto.AlterarSenhaRequest;
import br.com.romenig.plataforma.autenticacao.dto.ConfirmarEmailRequest;
import br.com.romenig.plataforma.autenticacao.dto.LoginRequest;
import br.com.romenig.plataforma.autenticacao.dto.LoginResponse;
import br.com.romenig.plataforma.autenticacao.dto.RedefinirSenhaRequest;
import br.com.romenig.plataforma.autenticacao.dto.SessaoAtualResponse;
import br.com.romenig.plataforma.autenticacao.dto.SolicitacaoEmailRequest;
import jakarta.validation.Valid;

/**
 * Endpoints da HU02.
 *
 * <p>{@code POST /api/auth/login} e publico: e ele mesmo que autentica.
 * {@code GET /api/auth/me} exige o cabecalho
 * {@code Authorization: Bearer <token>} - a regra esta no
 * {@code SecurityFilterChain}, nao em annotation.
 *
 * <p>Por que o logout nao tem endpoint: a API e sem estado e o token e
 * auto-contido, entao o servidor nao mantem lista de tokens emitidos e nao tem
 * como revogar um token ja entregue. Encerrar a sessao e descartar o token no
 * navegador - e o que o botao de logout faz. Uma revogacao real exigiria
 * guardar os tokens invalidos no banco, o que criaria uma tabela fora do
 * escopo da HU02.
 */
@RestController
@RequestMapping("/api/auth")
public class AutenticacaoController {

    private final AutenticacaoService autenticacao;
    private final SegurancaDaContaService seguranca;
    private final LimitadorDeTentativas limites;

    public AutenticacaoController(AutenticacaoService autenticacao, SegurancaDaContaService seguranca,
                                  LimitadorDeTentativas limites) {
        this.autenticacao = autenticacao;
        this.seguranca = seguranca;
        this.limites = limites;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody @Valid LoginRequest requisicao, HttpServletRequest request) {
        limites.exigirDisponivel("login", EnderecoIpDoCliente.obter(request) + ":" + requisicao.email().trim().toLowerCase(), 8, Duration.ofMinutes(15));
        return autenticacao.autenticar(requisicao);
    }

    @GetMapping("/me")
    public SessaoAtualResponse sessaoAtual() {
        return autenticacao.sessaoAtual();
    }

    @PostMapping("/reenvio-confirmacao")
    public void reenviarConfirmacao(@RequestBody @Valid SolicitacaoEmailRequest request, HttpServletRequest servlet) {
        limites.exigirDisponivel("confirmacao", EnderecoIpDoCliente.obter(servlet) + ":" + request.email().trim().toLowerCase(), 3, Duration.ofHours(1));
        seguranca.reenviarConfirmacao(SegurancaDaContaService.normalizarEmail(request.email()));
    }

    @PostMapping("/confirmar-email")
    public void confirmarEmail(@RequestBody @Valid ConfirmarEmailRequest request) {
        seguranca.confirmarEmail(request.token());
    }

    @PostMapping("/solicitar-redefinicao")
    public void solicitarRedefinicao(@RequestBody @Valid SolicitacaoEmailRequest request, HttpServletRequest servlet) {
        limites.exigirDisponivel("redefinicao", EnderecoIpDoCliente.obter(servlet) + ":" + request.email().trim().toLowerCase(), 3, Duration.ofHours(1));
        seguranca.solicitarRedefinicao(SegurancaDaContaService.normalizarEmail(request.email()));
    }

    @PostMapping("/redefinir-senha")
    public void redefinirSenha(@RequestBody @Valid RedefinirSenhaRequest request) {
        seguranca.redefinirSenha(request);
    }

    @PostMapping("/alterar-senha")
    public LoginResponse alterarSenha(@RequestBody @Valid AlterarSenhaRequest request) {
        return seguranca.alterarSenha(request);
    }

    @PostMapping("/encerrar-sessoes")
    public void encerrarSessoes() {
        seguranca.encerrarTodasAsSessoes();
    }
}
