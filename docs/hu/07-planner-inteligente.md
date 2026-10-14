# HU07 — Planner Inteligente de Estudos

**Status:** Critérios acadêmicos implementados — **incremento A concluído** (importação e
revisão de editais em PDF) e **incremento B implementado** (planner semanal
por prioridades). Incremento C (cronograma) implementado e validado.
**Dependências:** HU04, HU05, HU06

## Objetivo

Organizar a preparação do candidato em um plano de estudos.

## Critérios de aceite acadêmicos

Fonte: `HU1-RomenigNunesFrançaMarinhoSouto.pdf`, fornecido pelo responsável
em 13/10/2026. A HU07 exige:

1. Informar disponibilidade em dias e horários.
2. Receber atividades planejadas conforme essa disponibilidade.
3. Considerar disciplinas e conteúdos do edital selecionado.
4. Visualizar atividades programadas para cada período.

A meta semanal por prioridades (B) e a importação/revisão de editais (A)
são decisões técnicas do projeto. A extração automática por IA não é
exigida pelo documento acadêmico. O cronograma (C) completa os critérios
de disponibilidade e atividades por período.

## Incrementos e decisões adicionais

- **(A) ADMIN importa um edital em PDF** — o sistema extrai, com IA, a
  estrutura de disciplinas, assuntos, subassuntos, concursos e cargos, com a
  página de referência de cada item. O ADMIN revisa e corrige antes de
  aprovar.
- **(A) Importações são rastreáveis** — cada upload tem status
  (`AGUARDANDO_EXTRACAO`, `AGUARDANDO_REVISAO`, `FALHA`, `APROVADO`,
  `REJEITADO`), nome do arquivo, bytes originais e histórico de ida e volta
  pela revisão. PDF duplicado (mesmo SHA-256) é recusado.
- **(A) Edital aprovado entra no catálogo** — o que o aluno consulta
  (`GET /api/editais`) é só o que passou pela revisão e aprovação. Dois
  editais com o mesmo `titulo + orgao + ano` são recusados na aprovação.
- **(B) Planner semanal** — meta de horas, edital aprovado e prioridades
  escolhidas pelo aluno; distribuição proporcional exata, plano persistido
  por usuário e consulta de conteúdos com páginas, sem IA paga.
- **(C) Cronograma semanal** — disponibilidade por dia/horário e agenda com conteúdos do edital, persistida por aluno.

## Incremento B — planner semanal

Confirmado pelo responsável em 13/10/2026: o planner organiza o tempo
por **meta semanal de horas**, sem exigir horários disponíveis em cada dia.
O perfil da HU03 já oferece `metaEstudoSemanal` (opcional, de 1 a 168 horas).
O catálogo aprovado é a fonte das disciplinas e conteúdos reais; a
implementação deve continuar sem chamadas pagas de IA.

Confirmado: distribuição por **prioridades escolhidas pelo aluno** e uso
**apenas da meta semanal**, sem considerar data da prova. Implementação:
prioridades baixa/normal/alta (pesos 1/2/3), com divisão proporcional em
minutos e arredondamento pelo maior resto; desempate pelo id da disciplina.
A soma é sempre exatamente `horas * 60`.

O aluno seleciona um edital aprovado, informa uma meta inteira de 1 a 168
horas e uma prioridade para cada disciplina. A meta do perfil preenche a
tela inicialmente; alterar o plano não altera o perfil. A tela `/planner`
mostra a divisão semanal e os conteúdos reais com páginas de referência.

Um plano atual por usuário, persistido em `plano_estudo`/`plano_disciplina`
(migration V5). `GET /api/planner`: plano próprio ou 204 quando ausente.
`PUT /api/planner`: gera e salva/substitui o plano próprio. A identidade
vem exclusivamente da sessão; IDs de outros usuários não são aceitos.
Todas as disciplinas devem pertencer ao edital selecionado, sem repetição.
Cronograma por dia, sessões, conclusão de tarefas e histórico ficam no C.

### Verificação do incremento B

`DistribuidorSemanalTest` (3): pesos, arredondamento, desempate estável e
soma exata em várias metas e quantidades de disciplinas. `PlannerTest`
(6): geração/persistência/substituição, acesso apenas ao plano próprio,
autenticação, limites da meta, disciplinas do edital completas e sem
duplicidade, edital inexistente e prioridade inválida.

Frontend: `planner.test.ts` (4), `TelaPlanner.test.tsx` (6) e proteção de
rota em `App.test.tsx`. `e2e/planner.spec.ts` (3): proteção, geração e
restauração após recarga, conteúdo acessível, responsividade em 320/1280 px,
axe sem violações serious/critical e borda de erro no campo sem meta.
As requisições E2E são simuladas para nunca dependerem do Supabase.

Verificação local final: **89 testes backend, 96 frontend, 9 E2E**, build e
lint limpos. V5 autorizada pelo responsável e aplicada no Supabase em
13/10/2026, com esquema validado pelo Hibernate.

## Incremento A (implementado)

### Fluxo

```
ADMIN faz upload do PDF (multipart)      → POST /api/admin/editais/importacoes  (201)
   → valida %PDF, tamanho <= 10 MB, SHA-256 único
   → extrai o texto por página (PDFBox)  → monta o prompt → IA devolve JSON
   → valida a árvore extraída            → status AGUARDANDO_REVISAO ou FALHA

ADMIN revisa e corrige                  → PUT  /api/admin/editais/importacoes/{id}/conteudo
   → revalida a árvore; erros voltam em `errosEmJson`

ADMIN aprova                            → POST /api/admin/editais/importacoes/{id}/aprovar
   → revalida, deduplica (titulo+orgao+ano) e persiste edital completo

ADMIN rejeita / reprocessa              → POST .../rejeitar | .../reprocessar
Aluno consulta o catálogo               → GET /api/editais
```

### Decisões

| Decisão | Escolha |
|---|---|
| Quem importa/revisa/aprova | Somente **ADMIN** (`/api/admin/**`, autoridade `ADMIN` em todos os métodos) |
| Extração com IA | Abstração `ExtratorDeEditalIA` com dois contratos: `ExtratorDeEditalIaRest` (OpenAI *chat completions*, configurável por env) e `ExtratorDeEditalIaFake` (árvore determinística). `FabricaDeExtratorIa` escolhe por `plataforma.ia.tipo` (`rest`, padrão; `fake`) |
| IA em testes | `plataforma.ia.tipo: fake` no `application.yml` de teste — a suíte nunca chama a rede |
| Texto do PDF | `LeitorDePdf` (PDFBox 3.0.4): texto por página, sem páginas em branco |
| Validação da árvore | `ValidadorDeEditalExtraido`: título/órgão/ano e cada item com página; erros listam `campo`+`mensagem` |
| PDF original | Guardado em `bytea`; baixado via `GET .../{id}/pdf` (blob, com token) |
| Duplicidade | Upload: SHA-256 do arquivo (409, campo `arquivo`). Aprovação: `UNIQUE(titulo, orgao, ano)` (409, campo `edital`) |
| Limite de upload | 10 MB por arquivo (Spring: `max-file-size: 10MB`, `max-request-size: 12MB`) |
| Revisão | `PUT .../conteudo` revalida e guarda os erros em `errosEmJson`; aprovação é **bloqueada** enquanto houver erro |
| Erros HTTP | 400 campo `arquivo` (não-PDF/tamanho), 404 campo `importacao`, 409 campos `arquivo`/`edital`/`estado` |

### Segredo da IA

A chave da API nunca vai para o repositório: entra por variável de ambiente
(`IA_API_KEY`), modelo em `backend/.env.example`. O `.env` real está no
`.gitignore`.

## Pontos a confirmar

### Continuação sem chamadas pagas

Autorizada em 13/10/2026: modo `manual` para salvar PDF e aguardar
estrutura revisada pelo ADMIN, sem chamadas externas e sem dados fictícios.
A tela aceita um arquivo de revisão `.json`; o mesmo `PUT /conteudo`
recupera importações em `FALHA` e valida a estrutura antes da aprovação.

O conteúdo real do HTML CBM PE foi estruturado localmente em
`output/edital-cbm-pe-estrutura-revisada.json`: 13 disciplinas, 33 grupos
e 127 tópicos, com referências verificadas no PDF de 15 páginas. Ano
2026 confirmado pelo responsável. A revisão e a aprovação foram concluídas
no navegador contra o Supabase. Consulta somente leitura confirmou os
textos, páginas e relacionamentos completos no catálogo aprovado.

A aprovação revelou tópicos com mais de 255 caracteres. A migration V4,
autorizada pelo responsável e aplicada no Supabase, amplia `conteudo.nome`
para `TEXT`, sem truncamento. Testes locais: 80 backend, 85 frontend,
build/lint limpos. A validação da extração automática continua pendente.

### Validação real em 13/10/2026

V3 aplicada no Supabase; upload do PDF convertido (15 páginas) feito como
ADMIN no navegador, com persistência confirmada após reinício. A extração
real falhou porque o provedor retornou HTTP 429 por créditos esgotados
(`credit_balance_exhausted` / `insufficient_quota`). Nessa tentativa, o PDF
ficou salvo com falha. A continuação manual depois recuperou e aprovou
essa mesma importação, conforme registrado acima.

Correções decorrentes: aviso de sucesso condicionado ao status, causa da
falha persistida em `erros_validacao` sem repassar o corpo bruto do provedor,
limpeza do erro e atualização da árvore após reprocessamento bem-sucedido.
Verificação local: 76 testes backend, 83 frontend, build e lint limpos.

- Registro de estudos concluídos e desempenho: próxima proposta para HU08/HU09.
- **Provedor de IA em produção** — o `ExtratorDeEditalIaRest` assume o
  formato *chat completions* da OpenAI; outro provedor exige só a URL/modelo,
  sem tocar no fluxo.

---

**Próximo passo:** propor registros de estudo e desempenho para HU08/HU09.


## Incremento C — cronograma semanal

`GET /api/cronograma` retorna apenas a agenda do usuário ou 204.
`PUT /api/cronograma` recebe segunda-feira da semana e intervalos disponíveis.
O gerador respeita disponibilidade, quotas por disciplina e sessões de até
60 minutos; usa tópicos finais do edital e alterna conteúdos por disciplina.
Valida sobreposição, horários e capacidade antes de substituir a agenda.
A V6 cria cronograma_estudo, disponibilidade_estudo e atividade_estudo.
Mudanças no plano deixam a agenda sinalizada como desatualizada.

O aluno pode editar meta/prioridades em `/planner`, horários/semana em
`/cronograma`, e regenerar. A tela exibe agenda por data, horário,
disciplina, conteúdo e página. Teste real no Supabase: 10h, segunda a sexta
19:00–21:00, semana 19/10/2026; 17 atividades restauradas após recarga.
V6 aplicada com autorização. 99 testes backend, 108 frontend e 12 E2E
aprovados; build/lint limpos. Nenhuma chamada paga de IA.
