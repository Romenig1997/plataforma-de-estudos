package br.com.romenig.plataforma.autenticacao;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.autenticacao.dto.LoginRequest;
import br.com.romenig.plataforma.autenticacao.dto.LoginResponse;
import br.com.romenig.plataforma.autenticacao.dto.SessaoAtualResponse;
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

    public AutenticacaoController(AutenticacaoService autenticacao) {
        this.autenticacao = autenticacao;
    }

    @PostMapping("/login")
    public LoginResponse login(@RequestBody @Valid LoginRequest requisicao) {
        return autenticacao.autenticar(requisicao);
    }

    @GetMapping("/me")
    public SessaoAtualResponse sessaoAtual() {
        return autenticacao.sessaoAtual();
    }
}