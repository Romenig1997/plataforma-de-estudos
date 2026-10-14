package br.com.romenig.plataforma.edital.extracao;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import br.com.romenig.plataforma.edital.exception.FalhaNaExtracaoException;

/**
 * Implementacao de producao de {@link ExtratorDeEditalIA}: chama um provedor de
 * IA via REST no contrato "chat completions" (o mais comum entre provedores),
 * configurado por {@code plataforma.ia.*} (url, modelo, chave no .env).
 *
 * <p>O prompt pede o JSON na estrutura exata de {@link EditalExtraido} - schema
 * de implementacao, pois o documento academico nao define o formato. A revisao
 * manual a prova de alucinacoes: nada que a IA devolver grava no banco antes da
 * aprovacao.
 */
public class ExtratorDeEditalIaRest implements ExtratorDeEditalIA {

    private final RestClient rest;
    private final String modelo;
    private final String chave;
    private final ObjectMapper mapper;

    public ExtratorDeEditalIaRest(String url, String modelo, String chave, ObjectMapper mapper) {
        this.modelo = modelo;
        this.chave = chave;
        this.mapper = mapper;

        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(Duration.ofSeconds(10));
        fabrica.setReadTimeout(Duration.ofSeconds(120));

        this.rest = RestClient.builder()
                .baseUrl(url)
                .requestFactory(fabrica)
                .build();
    }

    @Override
    public EditalExtraido extrair(List<String> textoPorPagina) {
        String prompt = montarPrompt(textoPorPagina);

        try {
            RespostaDeIa resposta = rest.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + chave)
                    .body(Map.of(
                            "model", modelo,
                            "temperature", 0.2,
                            "messages", List.of(Map.of("role", "user", "content", prompt))))
                    .retrieve()
                    .body(RespostaDeIa.class);

            if (resposta == null || resposta.choices() == null || resposta.choices().isEmpty()
                    || resposta.choices().get(0).message() == null
                    || resposta.choices().get(0).message().content() == null) {
                throw new FalhaNaExtracaoException("A IA nao devolveu nenhuma resposta.");
            }

            return interpretar(resposta.choices().get(0).message().content());
        } catch (FalhaNaExtracaoException excecao) {
            throw excecao;
        } catch (RestClientResponseException excecao) {
            throw new FalhaNaExtracaoException(mensagemDoProvedor(excecao), excecao);
        } catch (Exception excecao) {
            throw new FalhaNaExtracaoException(
                    "Nao foi possivel conectar ao provedor de IA. Tente reprocessar mais tarde.", excecao);
        }
    }

    private String mensagemDoProvedor(RestClientResponseException excecao) {
        int status = excecao.getStatusCode().value();
        if (status == 401 || status == 403) {
            return "O provedor de IA recusou a chave ou o acesso. Confira a configuracao da IA.";
        }
        if (status == 429) {
            try {
                var erro = mapper.readTree(excecao.getResponseBodyAsString()).path("error");
                String codigo = erro.path("code").asText("");
                String tipo = erro.path("type").asText("");
                if ("insufficient_quota".equals(codigo) || "insufficient_quota".equals(tipo)
                        || "credit_balance_exhausted".equals(codigo)) {
                    return "O provedor de IA esta sem saldo ou cota disponivel. Regularize o saldo ou a cota e reprocesse a importacao.";
                }
            } catch (Exception ignorada) {
                // Nunca repassa o corpo do provedor, que pode conter dados sensiveis.
            }
            return "O provedor de IA atingiu o limite de requisicoes. Aguarde e reprocesse a importacao.";
        }
        return "O provedor de IA recusou a extracao (HTTP " + status + "). Confira a configuracao ou tente mais tarde.";
    }

    private EditalExtraido interpretar(String conteudo) {
        String json = conteudo.trim();
        if (json.startsWith("```")) {
            // Provedores costumam embrulhar o JSON em blocos de codigo.
            int primeiroFimDeLinha = json.indexOf('\n');
            int ultimoFimDoBloco = json.lastIndexOf("```");
            if (primeiroFimDeLinha > 0 && ultimoFimDoBloco > primeiroFimDeLinha) {
                json = json.substring(primeiroFimDeLinha + 1, ultimoFimDoBloco).trim();
            }
        }

        try {
            return mapper.readValue(json, EditalExtraido.class);
        } catch (JacksonException excecao) {
            throw new FalhaNaExtracaoException(
                    "A IA devolveu uma estrutura que nao e um edital valido.", excecao);
        }
    }

    private String montarPrompt(List<String> textoPorPagina) {
        StringBuilder prompt = new StringBuilder("""
                Abaixo esta o texto integral de um edital de concurso publico, divido por pagina,
                marcadas como [PAGINA n]. Extraia a estrutura do edital e responda APENAS com um
                JSON valido, sem texto antes nem depois, neste formato exato:

                {"titulo":"TITULO","orgao":"ORGAO","ano":ANO,"concursos":[{"nome":"CONCURSO","cargos":[{"nome":"CARGO"}]}],"disciplinas":[{"nome":"DISCIPLINA","pagina":N,"assuntos":[{"nome":"ASSUNTO","pagina":N,"subassuntos":[{"nome":"SUBASSUNTO","pagina":N}]}]}]}

                Regras:
                - Preencha apenas o que existir no texto; arrays vazios para o que nao existir.
                - Nao invente nome: use o texto. Se titulo ou orgao nao estiverem evidentes, use um valor curto possivel.
                - Para disciplina, assunto e subassunto, use o numero real da pagina (1-based) em que aparecem.
                - No maximo 3 niveis: disciplina > assunto > subassunto.

                Texto do edital:
                """);

        for (int pagina = 0; pagina < textoPorPagina.size(); pagina++) {
            prompt.append("\n[PAGINA ").append(pagina + 1).append("]\n")
                    .append(textoPorPagina.get(pagina));
        }

        return prompt.toString();
    }

    /** Contrato minimo de resposta de um endpoint "chat completions". */
    private record RespostaDeIa(List<Escolha> choices) {

        private record Escolha(Mensagem message) {
        }

        private record Mensagem(String content) {
        }
    }
}
