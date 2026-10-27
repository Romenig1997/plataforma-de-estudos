package br.com.romenig.plataforma.planner.agenda;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Component;

import br.com.romenig.plataforma.planner.cronograma.CronogramaResponse;

/**
 * Monta o cronograma no formato iCalendar (RFC 5545), o padrao lido pelo
 * Google Agenda, Outlook e calendarios de celular.
 *
 * <p>Horarios saem em UTC (sufixo {@code Z}), convertidos do fuso da
 * plataforma: o app de agenda mostra cada sessao no fuso do aparelho. Cada
 * sessao leva um lembrete 10 minutos antes.
 */
@Component
public class CalendarioIcs {

    private static final DateTimeFormatter UTC = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'");
    private static final String FIM = "\r\n";

    private final Clock relogio;

    public CalendarioIcs(Clock relogio) {
        this.relogio = relogio;
    }

    /** {@code cronograma} nulo gera um calendario vazio, valido para o app continuar assinando. */
    public String gerar(CronogramaResponse cronograma) {
        StringBuilder ics = new StringBuilder();
        linha(ics, "BEGIN:VCALENDAR");
        linha(ics, "VERSION:2.0");
        linha(ics, "PRODID:-//ESTUDA//Cronograma de estudos//PT-BR");
        linha(ics, "CALSCALE:GREGORIAN");
        linha(ics, "METHOD:PUBLISH");
        linha(ics, "X-WR-CALNAME:" + texto("ESTUDA - Cronograma de estudos"));
        linha(ics, "X-WR-TIMEZONE:" + relogio.getZone().getId());
        linha(ics, "REFRESH-INTERVAL;VALUE=DURATION:PT6H");
        linha(ics, "X-PUBLISHED-TTL:PT6H");
        if (cronograma != null) {
            String agora = UTC.format(OffsetDateTime.now(relogio).withOffsetSameInstant(ZoneOffset.UTC));
            Map<Long, String> cursos = new HashMap<>();
            cronograma.cursos().forEach(c -> cursos.put(c.editalId(), c.titulo()));
            for (CronogramaResponse.Atividade atividade : cronograma.atividades()) {
                linha(ics, "BEGIN:VEVENT");
                linha(ics, "UID:atividade-" + atividade.id() + "@plataformaestuda");
                linha(ics, "DTSTAMP:" + agora);
                linha(ics, "DTSTART:" + emUtc(atividade.data(), atividade.inicio()));
                linha(ics, "DTEND:" + emUtc(atividade.data(), atividade.fim()));
                linha(ics, "SUMMARY:" + texto(atividade.disciplina() + ": " + atividade.conteudo()));
                linha(ics, "DESCRIPTION:" + texto("Curso: " + cursos.getOrDefault(atividade.editalId(), "")
                        + "\nPágina " + atividade.pagina() + " do edital."));
                linha(ics, "STATUS:CONFIRMED");
                linha(ics, "BEGIN:VALARM");
                linha(ics, "ACTION:DISPLAY");
                linha(ics, "DESCRIPTION:" + texto("Hora de estudar: " + atividade.disciplina()));
                linha(ics, "TRIGGER:-PT10M");
                linha(ics, "END:VALARM");
                linha(ics, "END:VEVENT");
            }
        }
        linha(ics, "END:VCALENDAR");
        return ics.toString();
    }

    private String emUtc(LocalDate data, LocalTime hora) {
        return UTC.format(data.atTime(hora).atZone(relogio.getZone()).withZoneSameInstant(ZoneOffset.UTC));
    }

    /** Escapa os caracteres especiais de um valor de texto (RFC 5545, 3.3.11). */
    static String texto(String valor) {
        return valor.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
                .replace("\r\n", "\\n").replace("\n", "\\n");
    }

    /** Linhas acima de 75 bytes continuam na seguinte, iniciada por espaco (RFC 5545, 3.1). */
    static void linha(StringBuilder ics, String conteudo) {
        int bytes = 0;
        int limite = 75;
        for (int i = 0; i < conteudo.length(); ) {
            int ponto = conteudo.codePointAt(i);
            int tamanho = new String(Character.toChars(ponto)).getBytes(StandardCharsets.UTF_8).length;
            if (bytes + tamanho > limite) {
                ics.append(FIM).append(' ');
                bytes = 1;
                limite = 75;
            }
            ics.appendCodePoint(ponto);
            bytes += tamanho;
            i += Character.charCount(ponto);
        }
        ics.append(FIM);
    }
}
