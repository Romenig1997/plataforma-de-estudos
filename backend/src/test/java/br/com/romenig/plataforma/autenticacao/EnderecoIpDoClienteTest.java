package br.com.romenig.plataforma.autenticacao;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class EnderecoIpDoClienteTest {

    @Test
    void usaOPrimeiroEnderecoEncaminhadoPeloProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.4");
        request.addHeader("X-Forwarded-For", "198.51.100.23, 10.0.0.4");

        assertEquals("198.51.100.23", EnderecoIpDoCliente.obter(request));
    }

    @Test
    void usaOEnderecoDaConexaoSemProxy() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        assertEquals("127.0.0.1", EnderecoIpDoCliente.obter(request));
    }
}
