# HU18 — Cronograma na agenda do celular

**Status:** Implementada e validada localmente em 27/10/2026 (EPIC 2).
**Dependências:** HU07.

## Critérios de aceite

1. O sistema gera o cronograma no formato padrão de agenda iCalendar (.ics).
2. Cada sessão aparece na agenda com a disciplina, o conteúdo e o horário.
3. Ao alterar o cronograma na plataforma, a agenda é atualizada.
4. Somente o próprio candidato acessa o link da sua agenda.

## Comportamento

- `GET /api/cronograma/agenda` (com login) devolve o caminho do link secreto;
  `POST /api/cronograma/agenda/novo-link` troca o link e invalida o anterior.
- `GET /api/agenda/{token}.ics` é público, porque Google Agenda, Outlook e o
  calendário do celular não fazem login: o token (256 bits aleatórios) é a
  credencial. Ele fica na tabela `agenda_do_cronograma` (V20), fechada para a
  Data API do Supabase, e sai junto com a conta.
- O calendário é montado na hora a partir do cronograma atual (RFC 5545):
  horários em UTC, linhas dobradas em 75 bytes, textos escapados, lembrete 10
  minutos antes e `REFRESH-INTERVAL` de 6 horas. A frequência real de atualização
  é decidida por cada app (o Google Agenda costuma levar algumas horas).
- A tela oferece copiar o link, abrir no Google Agenda e abrir no app de
  calendário (`webcal://`).

## Testes

- `AgendaDoCronogramaTest` (5) e `CalendarioIcsTest` (2); `TelaCronograma.test.tsx`.
- Validação local real: o `.ics` foi lido pela biblioteca `icalendar` (Python)
  sem erros, com 8 sessões, nenhuma no feriado e o lembrete configurado.
