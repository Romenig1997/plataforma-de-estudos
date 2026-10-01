package br.com.romenig.plataforma.usuario;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Codifica e confere senhas com PBKDF2-HMAC-SHA256, usando apenas o JDK
 * (javax.crypto) - nenhuma dependencia extra e nada de Spring Security.
 *
 * O codigo gerado guarda o proprio numero de iteracoes, o salt e o hash:
 *
 *     pbkdf2-sha256$&lt;iteracoes&gt;$&lt;salt base64&gt;$&lt;hash base64&gt;
 *
 * Guardar as iteracoes junto com o hash permite aumentar o custo no futuro
 * sem invalidar as senhas ja gravadas.
 */
@Component
public class CodificadorDeSenha {

    private static final String ALGORITMO = "PBKDF2WithHmacSHA256";
    private static final String PREFIXO = "pbkdf2-sha256";
    private static final int TAMANHO_SALT = 16;
    private static final int TAMANHO_CHAVE = 256;

    private final SecureRandom aleatorio = new SecureRandom();
    private final int iteracoes;

    public CodificadorDeSenha(@Value("${plataforma.senha.iteracoes:210000}") int iteracoes) {
        this.iteracoes = iteracoes;
    }

    public String codificar(String senha) {
        byte[] salt = new byte[TAMANHO_SALT];
        aleatorio.nextBytes(salt);

        byte[] hash = derivar(senha.toCharArray(), salt, iteracoes);

        Base64.Encoder encoder = Base64.getEncoder();
        return PREFIXO + "$" + iteracoes
                + "$" + encoder.encodeToString(salt)
                + "$" + encoder.encodeToString(hash);
    }

    public boolean conferir(String senha, String codigoArmazenado) {
        if (codigoArmazenado == null || !codigoArmazenado.startsWith(PREFIXO + "$")) {
            return false;
        }

        String[] partes = codigoArmazenado.split("\\$");
        if (partes.length != 4) {
            return false;
        }

        int iteracoesArmazenadas;
        byte[] salt;
        byte[] hashEsperado;
        try {
            iteracoesArmazenadas = Integer.parseInt(partes[1]);
            Base64.Decoder decoder = Base64.getDecoder();
            salt = decoder.decode(partes[2]);
            hashEsperado = decoder.decode(partes[3]);
        } catch (IllegalArgumentException e) {
            return false;
        }

        byte[] hashCalculado = derivar(senha.toCharArray(), salt, iteracoesArmazenadas);

        // Comparacao em tempo constante, para nao vazar informacao por tempo
        return MessageDigest.isEqual(hashEsperado, hashCalculado);
    }

    private byte[] derivar(char[] senha, byte[] salt, int iteracoes) {
        PBEKeySpec spec = new PBEKeySpec(senha, salt, iteracoes, TAMANHO_CHAVE);
        try {
            return SecretKeyFactory.getInstance(ALGORITMO).generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("Algoritmo PBKDF2 indisponivel nesta JVM.", e);
        } finally {
            spec.clearPassword();
        }
    }
}