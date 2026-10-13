# HU07 — Planner Inteligente de Estudos

**Status:** Em andamento — **incremento A concluído** (importação e
revisão de editais em PDF). Incrementos B (planner) e C (cronograma)
pendentes.
**Dependências:** HU04, HU05, HU06

## Objetivo

Organizar a preparação do candidato em um plano de estudos.

## Critérios de aceite

> Extraídos do documento acadêmico da HU07. O incremento A foi trabalhado já
> neste ciclo porque é a entrada de dados que alimenta o planner: sem a
> estrutura de disciplinas/conteúdos de um edital, não há o que planejar.

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
- (B/C) Regras de geração do plano, tela de planejamento e persistência do
  plano/cronograma — a definir.

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

- **Configuração da inteligência do planner** (incremento B): disponibilidade
  de tempo, cronograma de provas e prioridades por disciplina seguem sem
  definição no escopo — é a informação mais crítica da HU e deve ser levantada
  antes de implementar o incremento B.
- **Provedor de IA em produção** — o `ExtratorDeEditalIaRest` assume o
  formato *chat completions* da OpenAI; outro provedor exige só a URL/modelo,
  sem tocar no fluxo.

---

**Próximo passo:** definir os critérios do planner (incremento B) antes de
implementar.