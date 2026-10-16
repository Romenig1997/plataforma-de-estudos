package br.com.romenig.plataforma.config;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Relogio da aplicacao no fuso dos alunos (America/Sao_Paulo).
 *
 * <p>{@code plataforma.relogio.fixo} (data-hora ISO com fuso) congela o
 * relogio; os testes usam isso para que a "semana atual" nao dependa do dia
 * em que rodam.
 */
@Configuration
public class ConfiguracaoDeRelogio {

    static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    @Bean
    Clock relogio(@Value("${plataforma.relogio.fixo:}") String fixo) {
        if (fixo.isBlank()) return Clock.system(FUSO);
        return Clock.fixed(OffsetDateTime.parse(fixo).toInstant(), FUSO);
    }
}
