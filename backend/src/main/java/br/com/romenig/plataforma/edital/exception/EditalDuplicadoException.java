package br.com.romenig.plataforma.edital.exception;

/**
 * Um edital ja existente impede a importacao (HU07, incremento A) - em duas
 * situacoes distintas:
 *
 * <ul>
 *   <li>{@code arquivo}: o PDF importado tem o mesmo SHA-256 de um ja
 *       carregado (deduplicacao por conteudo);</li>
 *   <li>{@code edital}: no momento da aprovacao, existe edital aprovado com a
 *       mesma combinacao titulo+orgao+ano (deduplicacao por identificacao).
 *   </li>
 * </ul>
 *
 * O {@code campo} diz ao frontend onde exibir a mensagem, no mesmo formato do
 * {@code RespostaDeErro}.
 */
public class EditalDuplicadoException extends RuntimeException {

    private final String campo;

    public EditalDuplicadoException(String campo, String mensagem) {
        super(mensagem);
        this.campo = campo;
    }

    public String getCampo() {
        return campo;
    }
}