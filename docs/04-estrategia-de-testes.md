# Estratégia de Testes

> Complementa a seção 4 do
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).

## Princípio

Cada HU é validada pelos **critérios de aceite** que ela define, antes de
avançar para a próxima. Teste não é uma etapa final do projeto — é parte
do critério de desenvolvimento.

## Níveis

| Nível | Ferramenta | Quando usar |
|---|---|---|
| Teste de contexto | JUnit 5 + `@SpringBootTest` | Garantir que a aplicação sobe |
| Teste de unidade | JUnit 5 | Regras de negócio isoladas (HU07+) |
| Teste de integração | JUnit 5 + `MockMvc` / Testcontainers | Endpoints e persistência |
| Teste de componente | Testing Library | Comportamento de telas (HU01+) |
| Teste de ponta a ponta | **Playwright** (desde HU06) | Fluxos que exigem navegador real: responsividade e contraste |
| Lint / typecheck | ESLint, `tsc --noEmit` | Rede de segurança estática |

## Configuração atual

```powershell
cd backend  && .\mvnw.cmd test    # JUnit 5 + MockMvc + H2
cd frontend && npm test           # Vitest + Testing Library
cd frontend && npm run test:watch
cd frontend && npm run test:e2e   # Playwright (sobe o dev server do Vite)
cd frontend && npm run build      # typecheck do TypeScript
cd frontend && npm run lint       # ESLint
```

> Primeira execução do `test:e2e` exige instalar o navegador:
> `npx playwright install chromium`.

### Backend

JUnit 5 com `@SpringBootTest` + `@AutoConfigureMockMvc`, contra H2 em memória
(`src/test/resources/application.yml`). Nenhum teste toca a rede, nem o
Supabase.

| Suíte | Testes | HU |
|---|---|---|
| `PlataformaApplicationTests` | 1 | Etapa 0 — sobe o contexto |
| `CadastroUsuarioTest` | 10 | HU01 |
| `AutenticacaoTest` | 16 | HU02 |
| `PerfilTest` | 12 | HU03 |
| `PerfilDeAcessoTest` | 8 | HU04 |
| `EstruturaDeBancoTest` | 6 | HU05 |
| `ImportacaoDeEditalTest` | 13 | HU07-A |
| `LeitorDePdfTest` | 2 | HU07-A |
| `ValidadorDeEditalExtraidoTest` | 8 | HU07-A |
| `ExtratorDeEditalIaRestTest` | 3 | HU07-A — saldo/cota, limite temporário e erros HTTP sem exposição do corpo do provedor |
| `ExtratorManualTest` | 1 | HU07-A — modo manual não fabrica conteúdo e exige revisão |
| `DistribuidorSemanalTest` | 3 | HU07-B — proporção, soma exata, arredondamento e desempate |
| `PlannerTest` | 6 | HU07-B — persistência, atualização, isolamento e validação |

**Total do backend: 128 testes.**

A suíte **HU07-A** usa a IA **fake** (`plataforma.ia.tipo: fake`), então
nada toca a rede: cada teste cadastra um ADMIN, faz login, sobe um PDF e
segue o fluxo de extração/revisão/aprovação. `ImportacaoDeEditalTest` cobre o
ciclo completo (upload, erros 400/404/409, rejeição, revisão com erros que
bloqueiam a aprovação, aprovação com deduplicação, download do PDF e o
catálogo público). `LeitorDePdfTest` gera um PDF real em memória com PDFBox
para provar a extração por página. `ValidadorDeEditalExtraidoTest` cobre a
validação da árvore extraída (título/órgão/ano, páginas, erros por campo).

`AutenticacaoTest` emite um token de verdade e o reapresenta, em vez de
simular a autenticação: só assim o filtro, a assinatura e a expiração são
verificados de ponta a ponta. `PerfilTest` segue o mesmo método — cada
teste cadastra pela API pública da HU01, faz login e só então usa o
recurso, sem autenticação simulada.

### Frontend

Vitest com `jsdom`, `@testing-library/react` e `@testing-library/user-event`.
Configuração em `vite.config.ts`; setup global em `src/preparacaoTestes.ts`
(jest-dom, limpeza automática entre testes, `sessionStorage` zerado a cada
teste).

| Arquivo | Testes | Cobre |
|---|---|---|
| `src/sessao.test.ts` | 7 | token no `sessionStorage`, `Authorization` no cabeçalho |
| `src/TelaLogin.test.tsx` | 10 | validação, erro de credencial, erro de rede, estado de carregamento |
| `src/App.test.tsx` | 14 | navegação, login bem-sucedido, logout, sessão expirada, rotas `/admin/editais` e `/planner` |
| `src/perfil.test.ts` | 7 | contrato HTTP do perfil (GET/PUT, 401, 400, rede) |
| `src/TelaPerfil.test.tsx` | 13 | carga, edição, validação local, erro por campo, 401, voltar |
| `src/TelaAdmin.test.tsx` | 7 | área admin, link para importação de editais |
| `src/componentes/Botao.test.tsx` | 3 | design system: variantes e estado `carregando` |
| `src/componentes/CampoFormulario.test.tsx` | 3 | design system: label↔`id`, `aria-invalid`, erro/ajuda descritos |
| `src/editais.test.ts` | 10 | contrato HTTP dos editais (upload, download, aprovar/rejeitar/reprocessar, revisão, catálogo, 401/400/409) |
| `src/TelaImportarEdital.test.tsx` | 13 | upload, lista de importações, edição, aprovação/rejeição, baixar PDF, erros por campo |
| `src/planner.test.ts` | 4 | GET/PUT, sessão, rede, erro por campo e formato de horas/minutos |
| `src/TelaPlanner.test.tsx` | 6 | meta do perfil, prioridades, plano salvo, conteúdos, estados vazio/erro e validação |

**Total do frontend: 136 testes.**

Regressões da validação real: upload/reprocessamento em `FALHA` não
anuncia sucesso; reprocessamento bem-sucedido atualiza a árvore da revisão.
No backend, falha de IA preserva o PDF e a causa, que é removida após
reprocessamento bem-sucedido. Os testes REST usam apenas um servidor HTTP
local para simular respostas de erro do provedor; não consomem a API real.

Continuação manual: a revisão recupera falha sem nova chamada de IA;
conteúdo inválido continua bloqueando a aprovação; edital já aprovado não
aceita revisão. Um tópico com mais de 1.800 caracteres é aprovado,
persistido e lido integralmente no catálogo, validando a migration V4.

Os testes simulam `fetch` com `vi.fn()` e `vi.stubGlobal`. Não há servidor de
teste nem biblioteca de mock de API: para contrato HTTP o backend já tem
MockMvc, e um mock mais sofisticado aqui só custaria legibilidade.

O acesso por `getByRole`/`getByLabelText` — e não por `data-testid` — é
deliberado: obriga o componente a ter os papéis e rótulos que a HU02 exige,
então o teste falha se a acessibilidade regredir.

### Ponta a ponta (desde a HU06)

**Playwright** roda o dev server do Vite (`playwright.config.ts`, `webServer`)
e abre as telas públicas — não precisa do backend. Cobre o que o jsdom não
calcula: layout e cor real no navegador.

| Teste | Critério da HU06 |
|---|---|
| Login/cadastro sem rolagem horizontal em 320/375 e 1280 px | 1 — responsividade |
| Auditoria **axe**: zero `color-contrast`, zero violação serious/critical | 2 — cores e contraste |
| Borda vermelha calculada (`rgb(220, 38, 38)`) + `aria-invalid` no campo vazio | 3 — feedback de formulário |

**Desde a HU07-A** o E2E cobre também a rota autenticada de editais sem
precisar do backend no ar:

| Teste (`e2e/editais.spec.ts`) | Cobre |
|---|---|
| `/admin/editais` sem sessão cai no login e não vaza o título da tela | rota protegida (`RotaProtegida`) |
| Com sessão simulada (token falso via `sessionStorage` + `addInitScript`), a tela monta o formulário e o aviso de erro de rede | auditoria **axe** da tela de importação (estado real no navegador, sem servidor) |

O fluxo completo com dados (upload → revisão → aprovação) fica no Vitest
(jsdom) e nos testes de integração do backend, que têm como simular a IA e
o servidor — isso não é alcançável de forma determinística por Playwright sem
um backend de verdade no ar.

## Regras

Desde HU07-B: `e2e/planner.spec.ts` acrescenta 3 testes (total E2E: 9),
com API simulada: protege a rota, gera e restaura o plano após recarga,
verifica conteúdos, rolagem horizontal, axe em 320/1280 px e feedback de
meta inválida. A tabela com rolagem recebeu foco por teclado após a
auditoria axe apontar `scrollable-region-focusable`.

- Um teste automatizado por critério de aceite relevante da HU
- Testes de regra de negócio não dependem de rede nem de banco real
- Falha de teste bloqueia o avanço da etapa
- Nenhum teste pode depender de dado de produção

## Pendências fora do escopo atual

Testes de fluxos autenticados completos de ponta a ponta exigem backend no
ar (ou mock de contrato). A HU06 validou por Playwright apenas telas
públicas; fluxos como "aluno edita o perfil no navegador" dependem de
decisão de HU futura conforme o escopo.

## HU07-C — critérios acadêmicos

Disponibilidade, atividades compatíveis, disciplinas/conteúdos e visão por
período são cobertos por GeradorCronogramaTest (5), CronogramaTest (5),
cronograma.test.ts (4), TelaCronograma.test.tsx (7), rota no App (+1) e
e2e/cronograma.spec.ts (3). Total atual: 12 E2E. Também são verificados
isolamento, preservação da agenda em erro, quotas, atualização do plano,
320/1280px e axe. Validação real de persistência concluída no Supabase V6.

## HU08

DashboardTest (7), TelaDashboard.test.tsx (6), e2e/dashboard.spec.ts (2).
Cada um dos quatro critérios está coberto por cálculos e fluxos; dados dos
alunos são isolados, totais ponderados, pais não duplicam tópicos, e próximas
atividades filtram datas e conclusão. E2E com API simulada: proteção, recarga,
320/1280px e axe. Total atual: 106 backend, 114 frontend, 14 E2E.


Correção vigente da HU08 (13/10/2026): aluno informa apenas conclusão do
conteúdo. Totais manuais de questões/acertos não são editáveis nem utilizados
pelo dashboard. Desempenho depende de respostas corrigidas pelo sistema;
módulo de questões em standby por pedido do responsável. As colunas existentes
da V7 foram preservadas, sem nova migration. HU08 parcial nesse requisito.

## HU09

Motor (6), integração/sessão (2), tela (4), E2E (2). Dados fictícios usados
apenas em testes de regras/exibição; aplicação real sem respostas permanece
sem recomendações. Critérios não declarados completos antes da fonte real.
Totais atuais: 114 backend, 118 frontend e 16 E2E, build/lint limpos.

## Questões — validação pendente do backend

Frontend atual: 126 testes, 19 E2E passaram com APIs simuladas; build/lint limpos.
QuestaoTest (8) escrito, não executado por falha da revisão automática (limite
de uso). A antiga suíte de 114 testes backend precede o código de questões;
não deve ser considerada validação do código novo. V8 não aplicada.


### Atualização vigente — questões validadas em 13/10/2026

V8 aplicada no Supabase e backend iniciado/validado. Resultados de respostas
corrigidas integram HU08 e HU09; os totais manuais antigos não são utilizados.
Quatro questões originais foram revisadas/publicadas; teste real de conta
exclusiva validou erro/acerto, agregação, comparação e recomendação, e a conta
foi removida. 122 testes backend, 126 frontend, 19 E2E, build/lint limpos.
Limite da revisão automática deixou de ser bloqueio. Próxima pendência: HU03 foto.

## Conferência final — foto da HU03

FotoPerfilTest (6), fotoPerfil.test.ts (4), FotoPerfilEditor.test.tsx (6),
E2E foto-perfil.spec.ts (2). Validam dados reais de imagem, autenticação,
isolamento, JPEG/PNG, redução, persistência, substituição, remoção, erros
e preservação de nome/foto. Supabase V9 validado com conta temporária removida.
Totais finais: 128 backend, 136 frontend, 21 E2E; build/lint limpos.
Matriz dos 30 critérios em validacao-final-das-hus.md.
