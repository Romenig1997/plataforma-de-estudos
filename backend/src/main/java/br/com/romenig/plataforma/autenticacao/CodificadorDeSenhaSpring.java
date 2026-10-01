package br.com.romenig.plataforma.autenticacao;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import br.com.romenig.plataforma.usuario.CodificadorDeSenha;

/**
 * Ponte entre o {@link PasswordEncoder} do Spring Security e o
 * {@link CodificadorDeSenha} da HU01 (PBKDF2-HMAC-SHA256).
 *
 * <p>Existe para que o {@code DaoAuthenticationProvider} consiga conferir a
 * senha usando o algoritmo que ja esta gravado no banco. Trocar para o BCrypt
 * do Spring agora invalidaria todas as senhas existentes, entao nao e uma
 * opcao.
 *
 * <p>A interface {@link PasswordEncoder} e do pacote
 * {@code spring-security-crypto}, que ja vem no
 * {@code spring-boot-starter-security} adicionado na HU02 — nenhuma
 * dependencia nova foi preciso declarar no pom.
 *
 * <p>O codigo da aplicacao nao chama {@link #encode(CharSequence)}: o
 * cadastro da HU01 continua passando por {@code CodificadorDeSenha.codificar}.
 * O metodo existe apenas para cumprir o contrato da interface.
 */
@Component
public class CodificadorDeSenhaSpring implements PasswordEncoder {

    private final CodificadorDeSenha codificador;

    public CodificadorDeSenhaSpring(CodificadorDeSenha codificador) {
        this.codificador = codificador;
    }

    @Override
    public String encode(CharSequence senha) {
        return codificador.codificar(senha.toString());
    }

    @Override
    public boolean matches(CharSequence senha, String codigoArmazenado) {
        return codificador.conferir(senha.toString(), codigoArmazenado);
    }
}