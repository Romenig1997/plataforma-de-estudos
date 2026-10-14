package br.com.romenig.plataforma.usuario;

import java.net.URI;
import java.time.Duration;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.usuario.dto.CadastroUsuarioRequest;
import br.com.romenig.plataforma.usuario.dto.CadastroUsuarioResponse;
import jakarta.validation.Valid;
import br.com.romenig.plataforma.autenticacao.LimitadorDeTentativas;

@RestController
@RequestMapping("/api/usuarios")
public class CadastroUsuarioController {

    private final CadastroUsuarioService cadastro;
    private final LimitadorDeTentativas limites;

    public CadastroUsuarioController(CadastroUsuarioService cadastro, LimitadorDeTentativas limites) {
        this.cadastro = cadastro;
        this.limites = limites;
    }

    @PostMapping
    public ResponseEntity<CadastroUsuarioResponse> cadastrar(
            @RequestBody @Valid CadastroUsuarioRequest requisicao, HttpServletRequest request) {

        limites.exigirDisponivel("cadastro", request.getRemoteAddr(), 5, Duration.ofHours(1));

        CadastroUsuarioResponse resposta = cadastro.cadastrar(requisicao);

        URI local = URI.create("/api/usuarios/" + resposta.id());
        return ResponseEntity.created(local).body(resposta);
    }
}
