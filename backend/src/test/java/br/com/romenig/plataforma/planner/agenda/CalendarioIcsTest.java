package br.com.romenig.plataforma.planner.agenda;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;

/** Regras do formato iCalendar que os apps de agenda exigem (RFC 5545). */
class CalendarioIcsTest {

    @Test
    void escapaVirgulaPontoEVirgulaBarraEQuebraDeLinha() {
        assertThat(CalendarioIcs.texto("a,b;c\\d\ne")).isEqualTo("a\\,b" + "\\" + ";c\\\\d\\ne");
    }

    @Test
    void quebraLinhasLongasEmAte75BytesSemPartirAcentos() {
        StringBuilder ics = new StringBuilder();
        CalendarioIcs.linha(ics, "SUMMARY:" + "Concordância verbal e nominal ".repeat(6));

        for (String linha : ics.toString().split("\r\n")) {
            assertThat(linha.getBytes(StandardCharsets.UTF_8).length).isLessThanOrEqualTo(75);
        }
        String desdobrado = ics.toString().replace("\r\n ", "");
        assertThat(desdobrado).isEqualTo("SUMMARY:" + "Concordância verbal e nominal ".repeat(6) + "\r\n");
    }
}
