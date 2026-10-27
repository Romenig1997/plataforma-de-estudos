# HU17 — Cronograma com feriados nacionais

**Status:** Implementada e validada localmente em 27/10/2026 (EPIC 2).
**Dependências:** HU07.

## Critérios de aceite

1. O sistema consulta os feriados nacionais do ano pela BrasilAPI (API pública e gratuita).
2. Ao gerar o cronograma, nenhuma sessão é planejada em dia de feriado.
3. O cronograma indica quais dias da semana são feriados e o nome do feriado.
4. Se a API estiver indisponível, o cronograma é gerado normalmente e o candidato é avisado.

## Comportamento

- `FeriadosBrasilApi` chama `GET https://brasilapi.com.br/api/feriados/v1/{ano}`
  (sem chave). A lista de cada ano fica em memória; uma falha fica guardada por
  10 minutos para não atrasar as telas. Tempo limite de 3 s para conectar e 5 s
  para ler.
- `GeradorCronograma` pula os períodos que caem em feriado. A meta continua
  conferida contra a disponibilidade normal da semana: o tempo do feriado fica
  sem horário, e a resposta informa `minutosSemHorario`.
- `GET/PUT /api/cronograma` devolvem `feriados` (data e nome),
  `feriadosIndisponiveis` e `minutosSemHorario`. A tela marca o dia como
  "Feriado", mostra o nome e avisa quanto da meta ficou sem horário.
- Variáveis: `PLATAFORMA_FERIADOS_TIPO` (padrão `brasilapi`) e
  `FERIADOS_API_URL` (só para apontar a um servidor de teste local).

## Testes

- `CronogramaComFeriadosTest` (4), `FeriadosBrasilApiTest` (3, contra um
  servidor HTTP local no formato da BrasilAPI), `TelaCronograma.test.tsx`.
- Validação local real: backend apontado para um servidor local que imita a
  BrasilAPI (a rede deste ambiente bloqueia o domínio). A chamada à API real
  acontece no Railway.
