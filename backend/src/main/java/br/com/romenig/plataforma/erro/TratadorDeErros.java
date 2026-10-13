package br.com.romenig.plataforma.erro;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import br.com.romenig.plataforma.autenticacao.exception.CredenciaisInvalidasException;
import br.com.romenig.plataforma.autenticacao.exception.SessaoInvalidaException;
import br.com.romenig.plataforma.edital.exception.EditalDuplicadoException;
import br.com.romenig.plataforma.edital.exception.ImportacaoNaoEncontradaException;
import br.com.romenig.plataforma.edital.exception.PdfInvalidoException;
import br.com.romenig.plataforma.usuario.dto.RespostaDeErro;
import br.com.romenig.plataforma.usuario.dto.RespostaDeErro.ErroValidacao;
import br.com.romenig.plataforma.usuario.exception.EmailJaCadastradoException;

/**
 * Traduz excecoes em respostas HTTP com mensagem por campo, no mesmo formato
 * para 400, 401 e 409. Assim o frontend exibe o erro proximo ao campo sem
 * precisar tratar dois formatos distintos.
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
     * Entrou na HU02. E-mail inexistente e senha incorreta caem na mesma
     * excecao e por isso produzem exatamente a mesma resposta: assim a API nao
     * revela quais e-mails tem conta na plataforma.
     */
    @ExceptionHandler(CredenciaisInvalidasException.class)
    public ResponseEntity<RespostaDeErro> credenciaisInvalidas(CredenciaisInvalidasException excecao) {
        ErroValidacao erro = new ErroValidacao("credenciais", excecao.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new RespostaDeErro(List.of(erro)));
    }

    /**
     * Token valido de um usuario que nao existe mais, ou sessao ausente quando
     * o endpoint exige autenticacao. 401 para o frontend tratar igual a um token
     * expirado: limpar a sessao e voltar para a tela de login.
     */
    @ExceptionHandler(SessaoInvalidaException.class)
    public ResponseEntity<RespostaDeErro> sessaoInvalida(SessaoInvalidaException excecao) {
        ErroValidacao erro = new ErroValidacao("autenticacao", excecao.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new RespostaDeErro(List.of(erro)));
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

    // -----------------------------------------------------------------------
    // HU07 - importacao de editais em PDF
    // -----------------------------------------------------------------------

    /**
     * PDF ausente, sem conteudo, ilegivel ({@code %PDF} ausente, PDFBox nao
     * abre) ou acima do limite de upload. 400 com o campo {@code arquivo},
     * igual aos demais erros de validacao de campos.
     */
    @ExceptionHandler(PdfInvalidoException.class)
    public ResponseEntity<RespostaDeErro> pdfInvalido(PdfInvalidoException excecao) {
        ErroValidacao erro = new ErroValidacao("arquivo", excecao.getMessage());
        return ResponseEntity.badRequest().body(new RespostaDeErro(List.of(erro)));
    }

    /**
     * Duplicidade de edital: mesmo PDF ja carregado (SHA-256) no upload, ou
     * mesmo titulo+orgao+ano ja aprovado. 409 com o campo indicado.
     */
    @ExceptionHandler(EditalDuplicadoException.class)
    public ResponseEntity<RespostaDeErro> editalDuplicado(EditalDuplicadoException excecao) {
        ErroValidacao erro = new ErroValidacao(excecao.getCampo(), excecao.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new RespostaDeErro(List.of(erro)));
    }

    /**
     * Importacao (ou o PDF/edital dela) com id inexistente. 404 no lugar de
     * deixar um NPE fluir.
     */
    @ExceptionHandler(ImportacaoNaoEncontradaException.class)
    public ResponseEntity<RespostaDeErro> importacaoNaoEncontrada(ImportacaoNaoEncontradaException excecao) {
        ErroValidacao erro = new ErroValidacao("importacao", excecao.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new RespostaDeErro(List.of(erro)));
    }

    /**
     * Estado invalido de um fluxo de negocio, como reprocessar uma importacao
     * ja aprovada. 409 com a mensagem da causa.
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<RespostaDeErro> estadoInvalido(IllegalStateException excecao) {
        ErroValidacao erro = new ErroValidacao("estado", excecao.getMessage());
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new RespostaDeErro(List.of(erro)));
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