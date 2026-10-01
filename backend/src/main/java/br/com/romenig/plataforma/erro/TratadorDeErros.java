package br.com.romenig.plataforma.erro;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import br.com.romenig.plataforma.usuario.dto.RespostaDeErro;
import br.com.romenig.plataforma.usuario.dto.RespostaDeErro.ErroValidacao;
import br.com.romenig.plataforma.usuario.exception.EmailJaCadastradoException;

/**
 * Traduz excecoes em respostas HTTP com mensagem por campo, no mesmo formato
 * para 400 e 409. Assim o frontend exibe o erro proximo ao campo sem precisar
 * tratar dois formatos distintos.
 */
@RestControllerAdvice
public class TratadorDeErros {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<RespostaDeErro> validarCampos(MethodArgumentNotValidException excecao) {
        List<ErroValidacao> erros = excecao.getBindingResult().getFieldErrors().stream()
                .map(this::traduzir)
                .toList();

        return ResponseEntity.badRequest().body(new RespostaDeErro(erros));
    }

    @ExceptionHandler(EmailJaCadastradoException.class)
    public ResponseEntity<RespostaDeErro> emailDuplicado(EmailJaCadastradoException excecao) {
        ErroValidacao erro = new ErroValidacao("email", excecao.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new RespostaDeErro(List.of(erro)));
    }

    /**
     * JSON malformado ou tipo de conteudo inesperado. Sem este handler o
     * Spring responde 400 sem corpo JSON, quebrando o contrato unico de erro
     * que o frontend consome.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<RespostaDeErro> corpoInvalido(HttpMessageNotReadableException excecao) {
        ErroValidacao erro = new ErroValidacao("corpo", "Corpo da requisicao invalido. Envie JSON com nome, email e senha.");
        return ResponseEntity.badRequest().body(new RespostaDeErro(List.of(erro)));
    }

    private ErroValidacao traduzir(FieldError erro) {
        // A mensagem vem da anotacao de validacao; o default do Beans fica
        // genérico demais para o usuário final.
        String mensagem = erro.getDefaultMessage() == null
                ? "Valor invalido."
                : erro.getDefaultMessage();
        return new ErroValidacao(erro.getField(), mensagem);
    }
}