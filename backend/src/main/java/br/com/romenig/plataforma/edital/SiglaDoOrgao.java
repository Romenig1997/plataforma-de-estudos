package br.com.romenig.plataforma.edital;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Sigla curta do orgao para a capa do card do curso.
 *
 * <p>Se o nome ja traz uma sigla em maiusculas ("CBM-PE", "TJPE"), ela e usada;
 * senao, juntam-se as iniciais das palavras significativas ("Policia Militar de
 * Pernambuco" vira "PMP"). O admin pode trocar a sigla depois.
 */
public final class SiglaDoOrgao {

    public static final int TAMANHO_MAXIMO = 20;
    private static final Set<String> LIGACOES = Set.of("de", "da", "do", "das", "dos", "e", "a", "o", "para", "em", "na", "no");
    private static final Pattern SIGLA_PRONTA = Pattern.compile("\\b\\p{Lu}{2,}(?:-\\p{Lu}{2,})?\\b");

    private SiglaDoOrgao() {
    }

    public static String gerar(String orgao) {
        if (orgao == null || orgao.isBlank()) return "";
        var pronta = SIGLA_PRONTA.matcher(orgao);
        if (pronta.find()) return limitar(pronta.group());

        StringBuilder iniciais = new StringBuilder();
        for (String palavra : orgao.trim().split("[\\s/-]+")) {
            if (palavra.isEmpty() || LIGACOES.contains(palavra.toLowerCase(Locale.ROOT))) continue;
            iniciais.appendCodePoint(Character.toUpperCase(palavra.codePointAt(0)));
            if (iniciais.length() == 5) break;
        }
        return limitar(iniciais.toString());
    }

    private static String limitar(String sigla) {
        return sigla.length() > TAMANHO_MAXIMO ? sigla.substring(0, TAMANHO_MAXIMO) : sigla;
    }
}
