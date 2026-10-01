package br.com.romenig.plataforma.usuario;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.romenig.plataforma.usuario.dto.CadastroUsuarioRequest;
import br.com.romenig.plataforma.usuario.dto.CadastroUsuarioResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/usuarios")
public class CadastroUsuarioController {

    private final CadastroUsuarioService cadastro;

    public CadastroUsuarioController(CadastroUsuarioService cadastro) {
        this.cadastro = cadastro;
    }

    @PostMapping
    public ResponseEntity<CadastroUsuarioResponse> cadastrar(
            @RequestBody @Valid CadastroUsuarioRequest requisicao) {

        CadastroUsuarioResponse resposta = cadastro.cadastrar(requisicao);

        URI local = URI.create("/api/usuarios/" + resposta.id());
        return ResponseEntity.created(local).body(resposta);
    }
}