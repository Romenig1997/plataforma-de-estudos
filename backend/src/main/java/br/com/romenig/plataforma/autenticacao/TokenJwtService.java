package br.com.romenig.plataforma.autenticacao;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Emissao e validacao do JWT da HU02.
 *
 * <p>O token carrega o {@code sub} (id do usuario) e, desde a HU04, o claim
 * {@code perfil} (ADMIN/ALUNO). Nao ha nome nem e-mail dentro dele: a area
 * autenticada busca esses dados no banco ({@code GET /api/auth/me}), o que
 * mantem o token pequeno e evita trafegar dado pessoal em um cabecalho que o
 * navegador expoe. O perfil viaja no token porque o backend autoriza sem
 * consultar o banco a cada requisicao; a contrapartida e que uma promocao a
 * ADMIN so reflete apos novo login (decisao da HU04).
 *
 * <p>A assinatura e HMAC-SHA256 com o segredo de
 * {@code plataforma.jwt.chave} (obrigatorio, vindo do {@code backend/.env}).
 * Trocar o segredo invalida todos os tokens emitidos - e o efeito desejado
 * quando se suspeita de vazamento.
 */
@Service
public class TokenJwtService {

    /**
     * HS256 usa uma chave de 256 bits. Abaixo disso o jjwt recusa a chave, e
     * falhar aqui, na inicializacao, e melhor do que aceitar um segredo curto
     * sem ninguem perceber.
     */
    private static final int TAMANHO_MINIMO_CHAVE = 32;

    /** Nome do claim que guarda o perfil de acesso (HU04). */
    private static final String CLAIM_PERFIL = "perfil";

    private final SecretKey chave;
    private final String emissor;
    private final Duration validade;

    public TokenJwtService(
            @Value("${plataforma.jwt.chave}") String segredo,
            @Value("${plataforma.jwt.emissor}") String emissor,
            @Value("${plataforma.jwt.expiracao-minutos}") long expiracaoMinutos) {

        byte[] bytes = segredo.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < TAMANHO_MINIMO_CHAVE) {
            throw new IllegalStateException(
                    "plataforma.jwt.chave precisa ter ao menos " + TAMANHO_MINIMO_CHAVE
                            + " bytes (JWT_SECRET). Configure um segredo maior no backend/.env.");
        }

        this.chave = Keys.hmacShaKeyFor(bytes);
        this.emissor = emissor;
        this.validade = Duration.ofMinutes(expiracaoMinutos);
    }

    public String gerar(Long idUsuario, String perfil) {
        Instant agora = Instant.now();

        return Jwts.builder()
                .issuer(emissor)
                .subject(String.valueOf(idUsuario))
                .claim(CLAIM_PERFIL, perfil)
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plus(validade)))
                .signWith(chave, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Confere assinatura, emissor e expiracao, e devolve o id do usuario.
     *
     * @throws JwtException se o token estiver malformado, assinado por outra
     *                     chave, emitido por outra aplicacao ou expirado.
     */
    public Long extrairUsuarioId(String token) throws JwtException {
        return Long.valueOf(claimsDe(token).getSubject());
    }

    /**
     * Devolve o perfil de acesso gravado no token (HU04), ou {@code null}
     * quando o claim nao existe - caso dos tokens emitidos antes da HU04.
     * O {@code FiltroDeTokenJwt} trata a ausencia como {@code ALUNO}, o
     * minimo privilegio, para nao quebrar sessoes ativas.
     *
     * @throws JwtException se o token estiver malformado, assinado por outra
     *                     chave, emitido por outra aplicacao ou expirado.
     */
    public String extrairPerfil(String token) throws JwtException {
        return claimsDe(token).get(CLAIM_PERFIL, String.class);
    }

    private Claims claimsDe(String token) throws JwtException {
        return Jwts.parser()
                .verifyWith(chave)
                .requireIssuer(emissor)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long validadeEmMinutos() {
        return validade.toMinutes();
    }
}