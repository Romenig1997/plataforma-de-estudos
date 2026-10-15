package br.com.romenig.plataforma.autenticacao;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Resolve o IP que originou a requisicao quando a aplicacao esta atras de um
 * proxy reverso, como o Railway.
 *
 * <p>O proxy acrescenta {@code X-Forwarded-For}; o primeiro endereco da lista
 * e o cliente original. Sem esse cabecalho (por exemplo, em desenvolvimento),
 * o endereco da conexao e usado normalmente.
 */
public final class EnderecoIpDoCliente {

    private EnderecoIpDoCliente() {
    }

    public static String obter(HttpServletRequest request) {
        String encaminhado = request.getHeader("X-Forwarded-For");
        if (encaminhado == null || encaminhado.isBlank()) {
            return request.getRemoteAddr();
        }

        String primeiroEndereco = encaminhado.split(",", 2)[0].trim();
        return primeiroEndereco.isEmpty() ? request.getRemoteAddr() : primeiroEndereco;
    }
}
