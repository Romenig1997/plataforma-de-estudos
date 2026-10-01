package br.com.romenig.plataforma.usuario.dto;

import java.util.List;

/**
 * Formato unico de erro da API, usado tanto por falha de validacao (400)
 * quanto por e-mail duplicado (409).
 */
public record RespostaDeErro(List<ErroValidacao> erros) {

    public record ErroValidacao(String campo, String mensagem) {
    }
}