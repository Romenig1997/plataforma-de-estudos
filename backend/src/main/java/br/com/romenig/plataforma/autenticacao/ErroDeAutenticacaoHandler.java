package br.com.romenig.plataforma.autenticacao;

import java.io.IOException;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

import br.com.romenig.plataforma.usuario.dto.RespostaDeErro;

/**
 * Traduz as respostas 401 e 403 do Spring Security para o mesmo formato JSON de
 * erro da HU01 ({@code {"erros":[{"campo","mensagem"}]}}).
 *
 * <p>Sem isso o Spring responderia 401/403 com o corpo padrao dele (HTML ou
 * vazio) e o frontend receberia uma resposta que ele nao sabe ler, quebrando o
 * contrato unico de erro adotado no cadastro.
 *
 * <p>Usa o {@code tools.jackson.databind.ObjectMapper}, que e o Jackson 3 do
 * Spring Boot 4 (o Jackson 2 fica apenas em escopo de runtime, para
 * compatibilidade).
 *
 * <p><strong>Sobre o 403:</strong> a HU02 nao tem regra por perfil - quem pode
 * fazer o que e a HU04. O handler existe para que, quando essas regras
 * chegarem, a resposta continue no mesmo formato JSON. Ate la ele nao
 * dispara, porque a unica regra de acesso em vigor e "exige autenticacao".
 */
@Component
public class ErroDeAutenticacaoHandler implements AuthenticationEntryPoint, AccessDeniedHandler {

    private final ObjectMapper json;

    public ErroDeAutenticacaoHandler(ObjectMapper json) {
        this.json = json;
    }

    /** Dispara quando a requisicao chega a um recurso protegido sem sessao valida. */
    @Override
    public void commence(HttpServletRequest requisicao, HttpServletResponse resposta,
                         AuthenticationException excecao) throws IOException {

        responder(resposta, HttpServletResponse.SC_UNAUTHORIZED, "autenticacao",
                "Faca login para acessar este recurso.");
    }

    /** Dispara quando ha sessao, mas a regra de acesso nega o acesso. */
    @Override
    public void handle(HttpServletRequest requisicao, HttpServletResponse resposta,
                       AccessDeniedException excecao) throws IOException {

        responder(resposta, HttpServletResponse.SC_FORBIDDEN, "autorizacao",
                "Voce nao tem permissao para acessar este recurso.");
    }

    private void responder(HttpServletResponse resposta, int status, String campo, String mensagem)
            throws IOException {

        resposta.setStatus(status);
        resposta.setContentType(MediaType.APPLICATION_JSON_VALUE);
        resposta.setCharacterEncoding("UTF-8");

        json.writeValue(resposta.getOutputStream(),
                new RespostaDeErro(List.of(new RespostaDeErro.ErroValidacao(campo, mensagem))));
    }
}