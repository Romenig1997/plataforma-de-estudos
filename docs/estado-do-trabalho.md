# Estado do Trabalho

> Registro de onde o projeto está e do que falta. Complementa
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md) e os documentos das HUs.
>
> **Atualizado em:** 13/10/2026 — HU01 a HU09 implementadas e validadas
> conforme os 30 critérios do documento acadêmico. Foto do perfil concluída.
> Verificação final: 128 testes backend, 136 frontend, 21 E2E, build/lint limpos.
> Supabase V9; contas temporárias de validação removidas e dados reais preservados.
> Conferência detalhada em validacao-final-das-hus.md. Sem chamadas pagas de IA.
> Extração automática com IA é uma pendência adicional, fora dos critérios acadêmicos.

## Onde estamos

| HU | Conteúdo | Estado |
|---|---|---|
| [HU01](hu/01-cadastro-de-usuarios.md) | Cadastro de usuários | **Concluída** (commit `485259a`) |
| [HU02](hu/02-autenticacao.md) | Autenticação com Spring Security + JWT | **Concluída** (commit `323c2d7`) |
| [HU03](hu/03-gerenciamento-de-perfis.md) | Gerenciamento de perfis | **Implementada e validada** — nome e foto, Supabase V9 |
| [HU04](hu/04-perfis-de-acesso-diferenciados.md) | Perfis de acesso (ADMIN/ALUNO) | **Concluída** (commit `82345f9`) |
| [HU05](hu/05-estrutura-de-banco-de-dados.md) | Estruturação de banco de dados | **Concluída** (commits `52ed326`, `00bf7ff`; validada no Supabase, `92af3fb`) |
| [HU06](hu/06-interface-de-usuario.md) | Interface de usuário (design system, router) | **Concluída** (commits `8703627`, `c543e5a`, `42b2f25`) |
| [HU07](hu/07-planner-inteligente.md) | Planner inteligente de estudos | **Critérios acadêmicos implementados** — A, B e C validados; extração automática opcional pendente |
| [HU08](hu/08-dashboard-de-desempenho.md) | Dashboard e registros | **Implementada e validada** — respostas corrigidas no servidor |
| [HU09](hu/09-analise-inteligente-de-desempenho.md) | Análise | **Implementada e validada** — fonte real e recomendações |

## Verificação

Verificação atual: backend e frontend completos, integração real no Supabase.

```powershell
cd backend  && .\mvnw.cmd test    # 128 testes, 0 falhas
cd frontend && npm test           # 136 testes, 0 falhas
cd frontend && npm run test:e2e   # 21 testes Playwright, 0 falhas
cd frontend && npm run build      # typecheck + build OK
cd frontend && npm run lint       # 0 problemas
```

| Suíte | Testes | HU |
|---|---|---|
| `PlataformaApplicationTests` | 1 | Etapa 0 |
| `CadastroUsuarioTest` | 10 | HU01 |
| `AutenticacaoTest` | 16 | HU02 |
| `PerfilTest` | 12 | HU03 |
| `PerfilDeAcessoTest` | 8 | HU04 |
| `EstruturaDeBancoTest` | 6 | HU05 |
| `ImportacaoDeEditalTest` | 13 | HU07-A |
| `LeitorDePdfTest` | 2 | HU07-A |
| `ValidadorDeEditalExtraidoTest` | 8 | HU07-A |
| `ExtratorDeEditalIaRestTest` | 3 | HU07-A — erros do provedor (HTTP local) |
| `ExtratorManualTest` | 1 | HU07-A — revisão obrigatória sem conteúdo fictício |
| `DistribuidorSemanalTest` | 3 | HU07-B — proporção, soma exata e desempate |
| `PlannerTest` | 6 | HU07-B — persistência, isolamento e validação |
| `sessao.test.ts` | 7 | HU02 |
| `TelaLogin.test.tsx` | 10 | HU02 |
| `App.test.tsx` | 14 | HU02/HU04/HU07 |
| `perfil.test.ts` | 7 | HU03 |
| `TelaPerfil.test.tsx` | 13 | HU03 |
| `TelaAdmin.test.tsx` | 7 | HU04/HU07 |
| `componentes/Botao.test.tsx` | 3 | HU06 |
| `componentes/CampoFormulario.test.tsx` | 3 | HU06 |
| `editais.test.ts` | 10 | HU07-A |
| `TelaImportarEdital.test.tsx` | 13 | HU07-A |
| `planner.test.ts` | 4 | HU07-B |
| `TelaPlanner.test.tsx` | 6 | HU07-B |
| `e2e/interface.spec.ts` (Playwright) | 4 | HU06 — critérios 1, 2 e 3 |
| `e2e/editais.spec.ts` (Playwright) | 2 | HU07-A — rota protegida + axe |
| `e2e/planner.spec.ts` (Playwright) | 3 | HU07-B — fluxo com API simulada, rota, responsividade e axe |

Os testes E2E da HU06 sobem o dev server do Vite e abrem telas públicas em
viewports de celular e PC (sem rolagem horizontal), rodam a auditoria **axe**
(zero violação de contraste e nenhuma serious/critical) e conferem a **borda
vermelha** no campo inválido.

Os testes E2E da HU07-A cobrem a rota autenticada **sem depender do
backend**: `/admin/editais` sem sessão cai no login (sem vazar o título da
tela), e com uma sessão simulada (token falso via `sessionStorage` +
`addInitScript`) a tela monta o formulário e o aviso de erro de rede — estado
real no navegador, auditado pelo axe. O fluxo completo com dados (upload →
revisão → aprovação) fica no Vitest e na suíte de integração, onde a IA é
simulada.

### Verificação manual da HU07-A (modo manual concluído; extração automática pendente)

**Início da retomada em 13/10/2026:** verificação local repetida, com 72 testes de
backend e 80 de frontend aprovados, build/lint limpos e os 6 casos E2E
aprovados. O README foi sincronizado com as HUs 06 e 07-A.

A configuração local contém as variáveis do banco, JWT e, após a retomada,
`IA_API_KEY`, preenchida pelo responsável. Após autorização explícita, o backend conectou
ao Supabase e o Flyway aplicou a V3: `Successfully applied 1 migration …
now at version v3`. O Hibernate validou o esquema e o Tomcat iniciou na
porta 8080. A chamada sem sessão a `GET /api/auth/me` respondeu 401.

A pasta de edital informada (`C:\Users\Romenig\Desktop\EDITAL`) contém
apenas um arquivo `.html` de edital verticalizado, sem PDF. O responsável
autorizou a conversão: o PDF foi gerado em
`output/pdf/edital-verticalizado-cbm-pe-oficial-combatente.pdf`, com 15
páginas, 13 disciplinas e 127 tópicos. Todos os tópicos foram conferidos
contra o texto extraído do PDF e as páginas foram revisadas visualmente.

O backend foi reiniciado após o preenchimento da chave. O responsável fez
login como ADMIN e o PDF convertido foi enviado pela tela. O arquivo de
15 páginas foi persistido no Supabase, mas a extração real ficou em
`FALHA`. Uma chamada mínima de diagnóstico confirmou HTTP 429,
`credit_balance_exhausted` / `insufficient_quota`: o provedor está sem
créditos disponíveis. Não houve aprovação nem publicação no catálogo.

Foram corrigidos o aviso indevido de sucesso em upload/reprocessamento
com falha e a ausência de diagnóstico persistido. O backend agora guarda
a causa em `erros_validacao`, distingue falta de saldo de limite temporário
e remove o erro após reprocessamento bem-sucedido. A tela também atualiza
a árvore retornada pelo reprocessamento. Verificação desta correção: 76 testes backend,
83 frontend, build/lint limpos; os 6 E2E passaram antes destas correções.
Após reiniciar, o reprocessamento no navegador confirmou a mensagem de
saldo/cota indisponível, sem aviso de sucesso. Evidência:
`output/validacao/importacao-sem-saldo.jpg`.

**Continuação sem gasto, autorizada pelo responsável:** o backend local
está configurado com `PLATAFORMA_IA_TIPO=manual`. Não chama a API externa
nem produz a árvore fictícia de testes. A estrutura real do HTML foi
preparada em `output/edital-cbm-pe-estrutura-revisada.json` e carregada pela
nova entrada **Estrutura revisada do edital**. Ano **2026** confirmado pelo
responsável. A revisão recuperou a importação em falha sem repetir upload.

A aprovação identificou o limite de 255 caracteres em `conteudo.nome`.
A V4, autorizada pelo responsável, amplia a coluna para `TEXT` e foi
aplicada no Supabase; `ddl-auto: validate` passou. Após isso, a aprovação
no navegador foi concluída. Consulta somente leitura no banco confirmou
**APROVADO**, 13 disciplinas, 33 grupos e 127 tópicos, com todos os textos,
páginas e relacionamentos idênticos à estrutura preparada.

Evidências: `output/validacao/edital-aprovado-manual.jpg` e
`output/validacao/catalogo-cbm-pe.json`. Verificação final local: **80
testes backend, 85 frontend, build e lint limpos**. Os 6 E2E anteriores
não foram repetidos após a continuação manual; o fluxo real foi conferido
no navegador. A extração automática com IA não foi validada com sucesso.

O incremento A foi validado por **testes automatizados** (backend e
frontend) e E2E de rota protegida, todos rodando sem rede. **Ainda pendente:**
exercitar no navegador a extração com a IA **real** (a **migration V3** já
foi aplicada no Supabase e o backend iniciou com esquema validado)
(`plataforma.ia.tipo=rest` + `IA_API_KEY`) — a árvore determinística usada nos
testes (`tipo=fake`) não exercita o provedor de produção.

### Verificação da HU07-B (planner semanal)

Regras confirmadas: meta semanal de horas, prioridades escolhidas pelo
aluno e sem data da prova. Pesos baixa/normal/alta = 1/2/3. A soma dos
minutos coincide exatamente com a meta, com maior resto e desempate por id.
Não utiliza IA, sessões por dia ou cronograma neste incremento.

V5 aplicada no Supabase após autorização explícita; Hibernate validou o
esquema. A tela `/planner` carregou o edital aprovado e a meta de **40h**
do perfil. Um plano inicial com prioridades **Normal** foi gerado e salvo
na conta do responsável; após recarregar, a tela recuperou a meta e a
distribuição: 8 disciplinas de 185 min e 5 de 184 min, total de 2.400 min.
As prioridades podem ser alteradas e o plano gerado novamente. Isso não
altera a meta no perfil. O acesso sempre usa a identidade da sessão.

A conferência também corrigiu a referência da disciplina **Estatística**:
ela começa na página 11 do PDF, mas a preparação inicial marcou página 5
por encontrar o nome dentro de Matemática. Estrutura local, catálogo e
registro da revisão foram corrigidos; os tópicos e seus tempos permanecem
intactos. Para mapear disciplinas, conferir o título da seção, não apenas
a primeira ocorrência do nome no texto.

Verificação final: 89 backend, 96 frontend, 9 E2E, build/lint limpos.
Evidência: `output/validacao/planner-semanal-salvo.jpg`.

### Verificação manual da HU05 (Supabase + backend real)

Feita contra o banco remoto, com a aplicação no ar:

- `spring-boot:run` subiu e o Flyway registrou a V1 como baseline e aplicou a
  V2 (`Successfully applied 1 migration … now at version v2`); no segundo boot,
  `Schema "public" is up to date`.
- A aplicação subiu com `ddl-auto: validate`, o que já prova que o banco
  migrado casa com as entidades `Usuario`/`Perfil`.
- Cadastro (`POST /api/usuarios`) → `201`, id=11; login → `perfil=ALUNO`;
  `GET /api/auth/me` → `perfil=ALUNO`; `GET /api/perfil` → `200`;
  `GET /api/admin/usuarios` como ALUNO → `403`. Confirma o vínculo `ALUNO` via
  `perfil_id`, a FK e a autorização por perfil.

> O usuário de teste `hu05.check.…@example.com` (id=11) ficou no banco do
> Supabase; pode ser removido manualmente, já que não há endpoint de exclusão.

### Verificação manual da HU04 (Supabase + backend real)

Histórico, feita contra o banco remoto com a aplicação no ar: cadastro cria
`ALUNO`; `GET /api/auth/me` e `GET /api/perfil` respondem; `GET
/api/admin/usuarios` como ALUNO → 403 `campo: autorizacao`; promoção manual
no banco só reflete após re-login; como ADMIN → 200 sem `senhaHash`. A conta
`romenig.14@gmail.com` (id=3) foi promovida a ADMIN para teste no navegador.

## Git

| Commit | Conteúdo |
|---|---|
| `98efde4` | Estrutura inicial (Etapa 0) |
| `485259a` | HU01 cadastro de usuários |
| `323c2d7` | HU02 autenticação |
| `58e0bc0` | HU03 gerenciamento de perfis |
| `c4e582c` | docs: HU03 (critérios, banco, testes) |
| `24669e9` | fix: 403 no `PUT /api/perfil` (CORS) + mensagem por campo |
| `69fd67c` | docs: registra o bugfix do 403 |
| `82345f9` | HU04 perfis de acesso diferenciados |
| `544eefc` | docs: HU04 (matriz de perfis, testes) e atualização do estado |
| `d1cf0cf` | docs: estado do trabalho com o commit da HU04 e validação pendente |
| `52ed326` | feat: HU05 estrutura de banco de dados (Flyway + tabela perfil) |
| `00bf7ff` | docs: HU05 (banco versionado, tabela perfil, testes) e atualização do estado |
| `e82e26e` | docs: registra commits da HU05 e validação no Supabase pendente |
| `92af3fb` | docs: valida HU05 contra o Supabase (baseline v1 → V2 aplicada) |
| `8703627` | HU06 interface de usuário (design system CSS puro, componentes base e router) |
| `c543e5a` | docs: HU06 (design system, rotas, testes E2E) e atualização do estado |
| `42b2f25` | docs: registra commits da HU06 no estado do trabalho |
| `9b11fba` | HU07-A importação de editais em PDF (backend: extração com IA, revisão, aprovação, catálogo; frontend: tela ADMIN; E2E da rota protegida) |
| `8dd2edb` | docs: HU07-A (critérios, banco, arquitetura, testes) e atualização do estado |

O `backend/.env` está no `.gitignore` e nunca foi versionado. O segredo real do
JWT existe só ali; o único valor de chave no repositório é o de teste, em
`src/test/resources/application.yml`, que não protege nada.

## Correções

| Quando | Bug | Causa | Correção |
|---|---|---|---|
| pós-HU03 | `PUT /api/perfil` devolvia **403** no navegador | CORS em duas camadas: o Spring Security aceitava o *preflight*, mas o Spring MVC (`ConfiguracaoWeb`) só aceitava `GET/POST/OPTIONS` | `24669e9` adicionou `PUT` a `ConfiguracaoWeb` e deixou o `TelaPerfil` apontar o campo com erro |
| HU07-A (frontend) | Aprovar/rejeitar/reprocessar mandavam a URL com `/undefined/{acao}` | Em `TelaImportarEdital`, `agir` chamava `acao(id)`, mas as funções de `editais.ts` são `(token, id)` — o `id` era tratado como token | `TelaImportarEdital` passou a chamar `acao(token, id)` e o tipo virou `(token: string, id: number) => ...` |
| HU07-A (frontend) | Botão "Baixar PDF" da tabela não fazia nada | `baixar(nomeDoArquivo)` sem o `id` só funcionava no painel de detalhe | `baixar` passou a aceitar o id opcional e é chamado com o id da importação também na tabela |

## Decisões tomadas na HU03

| Decisão | Escolha |
|---|---|
| Campos do perfil | Nome, e-mail (HU01) + meta de estudo semanal (1–168 h) + objetivo/motivação |
| Recurso | `GET/PUT /api/perfil`, separado de `/api/auth/me` |
| E-mail editável | Sim; normalizado; o e-mail próprio não conta como duplicado |
| Campos opcionais | `null` no banco, string vazia no formulário |
| Troca de senha | Fora do escopo |

## Decisões tomadas na HU04

| Decisão | Escolha |
|---|---|
| Perfis | Somente ADMIN e ALUNO nesta fase |
| Como virar ADMIN | Manual no banco; não há endpoint de promoção |
| Onde mora o perfil | No JWT (cópia) — o filtro autoriza sem consultar o banco |
| Promoção/degradação | Só reflete no próximo login |
| Token antigo sem claim | Tratado como ALUNO (least privilege) |
| Área admin | Mínima: `GET /api/admin/usuarios` + tela "Área admin" |

## Decisões tomadas na HU05

O documento da HU tem a tabela completa com justificativa. O resumo é:

| Decisão | Escolha |
|---|---|
| O que é a tabela `perfis` | O perfil de **acesso** (ADMIN/ALUNO), não os dados do perfil da HU03 |
| Relacionamento | 1:N (`usuario.perfil_id → perfil.id`) |
| Coluna `perfil` (texto) | Removida após backfill para `perfil_id` |
| `CHECK` adiado na HU04 | Desnecessário: `FK` + `UNIQUE` já impedem valor inválido |
| Senhas | Mantido PBKDF2-HMAC-SHA256 (trocar invalidaria hashes existentes) |
| Migração | Flyway (substituiu o `schema.sql`), com baseline do Supabase |
| Entidades de domínio (planner, edital, etc.) | Fora desta HU — dependem das HUs 07–09, sem conteúdo definido |

## Decisões tomadas na HU06

| Decisão | Escolha |
|---|---|
| Biblioteca de CSS / componentes | Nenhuma — **CSS puro com tokens** em `:root` (`src/index.css`); componentes base próprios em `src/componentes/` |
| Router | `react-router-dom` 7.18.4: `/login`, `/cadastro`, `/app`, `/perfil`, `/admin`, coringa `*` → `/login`; `RotaProtegida` manda sem token para o login |
| Feedback visual de formulário | Borda vermelha (`--color-erro`) + mensagem de erro + `aria-invalid` + `aria-describedby` |
| Contraste / acessibilidade | Auditoria **axe** no teste ponta a ponta (Playwright) — regra `color-contrast` (WCAG AA) |
| `eslint-plugin-jsx-a11y` | Não entrou: incompatível com o ESLint 10 (peer `^9`) |

## Decisões tomadas na HU07 (incremento A)

| Decisão | Escolha |
|---|---|
| Quem importa/revisa/aprova | Somente **ADMIN** (`/api/admin/editais/**` → `hasAuthority("ADMIN")`) |
| Extração com IA | Abstração `ExtratorDeEditalIA` + `ExtratorDeEditalIaRest` (OpenAI *chat completions*, configurável por env) e `ExtratorDeEditalIaFake` (árvore determinística, usada nos testes); `FabricaDeExtratorIa` escolhe por `plataforma.ia.tipo` |
| Jackson | Spring Boot 4 auto-configura **Jackson 3** (`tools.jackson.*`); `com.fasterxml.*` não entra no código da aplicação (só arrastado pelo `jjwt-jackson`) |
| PDF | **PDFBox 3.0.4** com `Loader.loadPDF(byte[])` (a `PDDocument.load(byte[])` foi removida na 3.x) |
| Estrutura extraída | `EditalExtraido`: título/órgão/ano + `concursos[].cargos[]` + `disciplinas[].assuntos[].subassuntos[]` com `pagina` (1-based) |
| Upload | Síncrono, multipart, até 10 MB/arquivo (12 MB de request); PDF inválido → 400 campo `arquivo` |
| Duplicidade | Upload: **SHA-256** (`UNIQUE edital_pdf.sha256`) → 409 campo `arquivo`. Aprovação: **`UNIQUE(titulo, orgao, ano)`** → 409 campo `edital` |
| Revisão | `PUT /{id}/conteudo` revalida e guarda `errosValidacao`; aprovação bloqueada enquanto houver erro |
| Download | `GET /{id}/pdf` devolve o `bytea` como `application/pdf`, com o nome original |
| Modelo de domínio | `controle: edital_pdf` (bytes) separado de `edital` (aprovado); `conteudo` é unitário (subassunto = `conteudo` com `pai_id`) |
| IA em testes | `plataforma.ia.tipo: fake` no `application.yml` de teste — a suíte nunca chama a rede |
| Chave da IA | `IA_API_KEY` por variável de ambiente; só exigida com `tipo=rest` |

## Limitações conhecidas

Registradas de propósito, não são bug:

- **O perfil de acesso é uma cópia no JWT.** Promover ou rebaixar um usuário
  no banco muda o próximo login, mas quem já está logado mantém o perfil
  antigo até re-logar.

- **Token no `sessionStorage` continua legível por JavaScript.** Não protege
  contra XSS. Cookie httpOnly seria mais seguro, mas exige mudança no backend e
  tratamento de CSRF.

- **Logout não revoga o token.** Revogação real exigiria tabela de revogação,
  que segue não implementada (não pertence à HU05).

- **Baseline do Flyway no Supabase.** O banco remoto já tinha a estrutura da
  V1 (criada pelo `schema.sql` antigo); por isso a aplicação sobe com
  `baseline-on-migrate` + `baseline-version: 1`. Nesse banco a V1 não é
  executada — só a V2 em diante (confirmado: baseline v1 → V2 aplicada). Um
  banco vazio (H2 dos testes) roda V1 e V2.

- **Docker não validado.** Os `Dockerfile` e o `docker-compose.yml` existem mas
  nunca foram construídos nem executados — não há Docker na máquina.

- **`GET /api/health` foi removido.** Era técnico da Etapa 0.

- **Migrations V3 e V4 aplicadas no Supabase em 13/10/2026.** O Flyway
  avançou até a V4 e o Hibernate validou o esquema. O fluxo manual foi
  aprovado no navegador; a extração automática continua pendente.

- **A extração com IA real foi tentada, mas está bloqueada por saldo/cota.**
  A chave foi configurada e o PDF foi salvo no Supabase; o provedor responde
  HTTP 429 (`credit_balance_exhausted` / `insufficient_quota`). O caminho de
  falha foi exercitado no navegador; o resultado real e a aprovação ainda
  dependem de regularizar o saldo e reprocessar a importação existente.

- **O fluxo completo não tem E2E automatizado.** A validação manual real
  cobriu login ADMIN, upload, falha da IA, revisão local sem IA e aprovação
  no Supabase. O Playwright automatizado cobre rota protegida e
  acessibilidade; integração e Vitest cobrem regras e comportamento.

## Como retomar

### Subir para testar no navegador

Dois terminais:

```powershell
# Terminal 1 — backend (usa o .env local, que aponta para o Supabase)
cd backend
.\mvnw.cmd spring-boot:run
# http://localhost:8080

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# http://localhost:5173
```

No boot contra o Supabase, o Flyway aplica migrations ainda pendentes.
O banco remoto já está na **V9**, aplicada nesta retomada. O
Vite faz proxy de `/api` para `localhost:8080`, mas o backend revalida o CORS
em toda requisição — a lista de métodos em `ConfiguracaoWeb` precisa cobrir o
que a API usa (`GET`, `POST`, `PUT` + `OPTIONS`). Para o fluxo de edital
funcionar no navegador é preciso configurar `IA_API_KEY` no `.env` (ou
`PLATAFORMA_IA_TIPO=fake` para usar a árvore determinística sem chamar a IA)
e entrar como ADMIN. A configuração local atual usa `PLATAFORMA_IA_TIPO=manual`:
salva o PDF para revisão sem chamadas externas. Use **Estrutura revisada
do edital** para carregar o conteúdo real preparado e salvar antes de aprovar.

### Sem depender do Supabase

```powershell
cd backend
.\mvnw.cmd -Ph2runtime spring-boot:run
```

Sobe a aplicação real contra H2 em memória (Flyway roda V1 a V9 do
zero). O banco morre com o processo, então é preciso cadastrar a conta e
promovê-la a ADMIN a cada boot para testar a importação de editais.

### Para parar

```powershell
# Ctrl+C nos dois terminais
```

## Cronograma semanal — HU07-C

Implementado em `/cronograma`: disponibilidade por dia e intervalo, semana
iniciando na segunda-feira e atividades com disciplinas, tópicos reais e páginas.
Sessões de até 60 minutos preservam os minutos de cada disciplina do plano.
Sobreposição, horários invertidos e capacidade insuficiente são recusados sem
apagar a agenda anterior. Alterar o plano sinaliza a necessidade de regenerar.
O aluno escolhe e altera a meta em `/planner` e os horários em `/cronograma`.

V6 autorizada e aplicada no Supabase em 13/10/2026. Teste real: meta de 10h,
segunda a sexta, 19:00–21:00, semana de 19/10/2026; 17 atividades, 600 minutos,
13 disciplinas. Agenda salva e restaurada após recarga. Nenhuma chamada paga.

Testes adicionais: `GeradorCronogramaTest` (5), `CronogramaTest` (5),
`cronograma.test.ts` (4), `TelaCronograma.test.tsx` (7), rota protegida em
`App.test.tsx` (+1), `e2e/cronograma.spec.ts` (3). Totais: 99 backend,
108 frontend e 12 E2E; build/lint limpos. E2E verifica responsividade,
acessibilidade, persistência com API simulada e feedback de horário inválido.

## Dashboard — HU08

Critérios e definição de progresso aprovados pelo responsável. Progresso por
conclusão dos tópicos finais do edital atual; desempenho ponderado por acertos
sobre questões por disciplina; próximas cinco atividades futuras de tópicos
pendentes. Formulário permite marcar/desmarcar e corrigir os totais acumulados.
Registros por aluno/tópico, isolados e preservados ao trocar edital. Painel
atualizado após salvar. `/dashboard` protegida e ligada na área autenticada.
V7 cria registro_estudo; não altera editais, planos ou cronogramas.

Testes novos: DashboardTest (7), TelaDashboard.test.tsx (6),
e2e/dashboard.spec.ts (2). Totais: 106 backend, 114 frontend e 14 E2E.
Build/lint limpos; acessibilidade e responsividade verificadas. Sem IA paga.

## Próximo passo

HU09 preparada com autorização. Integrar respostas corrigidas quando o
módulo de questões sair do standby para completar HU08/HU09. HU03 continua com edição da foto pendente.
Extração automática de edital é uma pendência separada.


Validação real em 13/10/2026: V7 aplicada no Supabase e Hibernate validado.
Dashboard carregou 127 tópicos, 13 disciplinas e próximas atividades da semana
19/10. Registro temporário em Português: 1 tópico concluído (0,79%) e 8/10
acertos (80%), com persistência após recarga e atualização das próximas
atividades. Depois desmarcado e totais retornados a zero; painel confirmado
em 0% e “Sem dados”. Evidência: output/validacao/dashboard-hu08.jpg.


### Correção de fluxo da HU08 — 13/10/2026

Responsável esclareceu: aluno só marca/desmarca conclusão; questões devem ser
corrigidas pelo sistema. Campos manuais retirados e backend deixou de usar
os totais de questões/acertos dos registros. Desempenho exibe “Sem dados” até
respostas corrigidas. Módulo de questões em standby por pedido explícito;
seguir fluxo das HUs. HU08 não deve ser declarada integralmente concluída.
Suítes afetadas passaram: 7 backend, 6 frontend, 2 E2E; build/lint limpos.
Sem nova migration. Evidência da correção em output/validacao/dashboard-hu08-correcao.jpg.


### HU09 — estrutura implementada em 13/10/2026

`/analise` e GET `/api/analise`, dados da sessão e edital atual. Motor calcula
percentuais por disciplina, compara com as outras disciplinas e gera recomendações
apenas quando há resultados suficientes. Dados insuficientes enquanto a fonte de
respostas corrigidas não existe; questões permanecem em standby. Sem nova migration
ou IA paga. Testes totais: 114 backend, 118 frontend, 16 E2E; build/lint limpos.
Novos: AnalisadorDesempenhoTest (6), AnaliseTest (2), TelaAnalise (4), E2E (2).
HU09 parcial, sem declarar aceite integral. Evidência: output/validacao/analise-hu09.jpg.

Validação real HU09: backend reiniciado sem nova migration, tela carregou o
edital CBM PE e as 13 disciplinas da sessão, sem dados de acertos e sem
recomendações fictícias. Evidência salva em output/validacao/analise-hu09.jpg.


## Retomada de questões — pendência atual

Responsável aprovou rascunhos conforme os conteúdos do PDF, revisão pelo ADMIN,
publicação e correção automática. Código e V8 preparados; frontend verificado
com 126 testes, 19 E2E e build/lint limpos. O backend atual em execução permanece
na versão anterior e o Supabase na V7. Não foram importadas/publicadas questões.

A tentativa de executar Maven foi bloqueada antes de iniciar por falha da
revisão automática: limite de uso. Não foi uma avaliação de insegurança.
Não tentar contornar por outro caminho. Quando disponível, rodar os testes
backend (122 previstos), aplicar V8, reiniciar e validar o fluxo real. Não
declarar desempenho/integração concluídos antes disso.

Material revisável: output/questoes/revisao-cbm-pe.md e cbm-pe-rascunhos.json.
Detalhes em questoes-e-correcao.md. Login real confirmado nesta retomada.


## Estado vigente após desbloqueio — 13/10/2026

Falha da revisão automática resolvida. 122 testes backend passaram. V8 aplicada
no Supabase; servidor validou esquema. Quatro questões originais CBM PE
importadas, revisadas e publicadas (IDs 1–4). Visão aluno sem gabarito antecipado.

Validação real com conta temporária: uma errada em Português (0%), uma correta
em Matemática (100%), geral 50% e recomendação em Português. Primeira resposta
preservada (409 ao repetir) e correção restaurada. Conta, respostas e plano de
teste removidos; dados do usuário real preservados. Suítes frontend mantidas:
126 testes, 19 E2E, build/lint limpos. HU08 e HU09 implementadas e validadas.
Evidências: output/validacao/questoes-integracao-real.json e questoes-publicadas.jpg.

**Próximo passo vigente:** propor a edição da foto do perfil para concluir HU03,
antecipando armazenamento/limites de imagem antes de implementar. Questões
adicionais podem ser cadastradas e aprovadas pelo ADMIN; geração automática
por IA não pertence ao fluxo implementado. Extrator de edital com IA segue
como pendência separada. Não repetir migrations nem importar novamente o lote.


## Estado final vigente — HU03 concluída

V9 aplicada: foto_perfil guarda PNG normalizado e protegido pela sessão. Tela
permite selecionar PNG/JPEG, visualizar prévia, salvar, substituir e remover.
Limite 2 MB e validação real do arquivo antes de alterar a foto existente.
Editar nome não remove foto. Conta temporária validou novo login, nome e
remoção no Supabase; removida depois. Dados reais do usuário preservados.
128 testes backend, 136 frontend, 21 E2E; build/lint limpos.

Conferência do PDF acadêmico: 30 critérios das HU01–HU09 atendidos. Matriz em
validacao-final-das-hus.md. Não há HU acadêmica pendente neste documento.
As pendências históricas acima ficaram resolvidas; geração/extração automática
por IA e execução Docker são extras separados. Nenhuma chamada paga.

## Atualização visual — 13/10/2026

Identidade visual aplicada a todas as rotas com referência no site https://www.grancursosonline.com.br/: cabeçalho branco em duas linhas, faixa vermelha, azul-marinho, destaques dourados, cartões claros e ações azuis/vermelhas. Marca local ESTUDA. e textos adaptados aos recursos reais do projeto.

Nova página inicial pública em `/`, com cartões que encaminham aos fluxos protegidos existentes. Login continua em `/login`; login bem-sucedido continua encaminhando para `/app`. Layout compartilhado cobre cadastro, perfil, planejamento, cronograma, questões, dashboard, recomendações e administração. APIs, autenticação e banco mantidos.

Validação: build, lint, 136 testes unitários e 22 testes Playwright aprovados, incluindo responsividade e axe. Nova verificação cobre a página inicial em 320/1280px e seus seis links principais. Conferência visual no navegador em desktop e 375px; evidências em `output/validacao/visual-inicial-desktop.png` e `visual-inicial-mobile.png`.

## Refinamento de produção — V10 ativada

Implementados localmente: confirmação de e-mail, recuperação e alteração de
senha, encerramento de todas as sessões, JWT com versão de sessão, tokens de
e-mail hashados e temporários, limitação de tentativas, health check, cabeçalhos
de segurança no nginx e workflow de CI. A V10 preserva as contas existentes
como verificadas. A suíte local aprovou 129 testes de backend, 136 de frontend,
22 Playwright, build e lint.

A V10 foi aplicada ao Supabase em 14/10/2026 e o Flyway confirmou o schema na
versão 10. O SMTP do Brevo foi configurado com TLS e autenticação; após a
autorização do IP público do backend, o health check retornou `UP` para banco e
e-mail. O backend local está disponível em `http://localhost:8080` e a
verificação é `GET /actuator/health`.

O último passo de validação manual é criar uma conta nova com um endereço de
e-mail acessível, abrir o link de confirmação recebido e entrar na plataforma.
O guia operacional está em `05-operacao-e-publicacao.md`.

## Vários cursos por aluno — 15/10/2026 (validado localmente, sem deploy)

Branch `feat/varios-cursos` (base: `feat/melhorias-ux-arquitetura`).

- **Modelo:** cada plano é a inscrição do aluno em um edital (`UNIQUE(usuario_id, edital_id)`);
  um plano por aluno fica `em_foco` e é o curso que as telas abrem sem `?editalId=`.
- **Migrations:** `V12__plano_por_curso` (Java: remove a `UNIQUE(usuario_id)` da V5 pelo
  `information_schema`, funciona no PostgreSQL e no H2) e `V13__inscricoes_e_cronograma_combinado.sql`
  (coluna `em_foco`, tabela `cronograma_plano`, colunas antigas do cronograma passam a nulas).
  Planos existentes viram o foco do seu aluno; o cronograma existente fica ligado ao plano.
- **API:** `GET /api/cursos/inscricoes`, `POST|DELETE /api/cursos/{editalId}/inscricao`,
  `PUT /api/cursos/foco`; `?editalId=` opcional em planner, dashboard, análise e questões.
  Registro de estudo e resposta valem para qualquer curso inscrito.
- **Cronograma combinado:** uma agenda por aluno com as disciplinas de todos os cursos; cancelar
  um curso remove só as atividades dele; entrar em curso novo marca a agenda como desatualizada.
- **Frontend:** Meus cursos (inscritos + vitrine "Explorar cursos"), inscrição pela tela do
  curso, Planner com abas por curso, seletor de curso em Desempenho/Análise/Questões.

Verificação local: backend 147 testes, frontend 163, E2E 24, lint e build limpos. V12/V13
aplicadas em H2 vazio (testes) e em H2 com dados do formato antigo (plano e cronograma
preservados). **Pendente:** aplicar V12/V13 no Supabase — somente com autorização explícita.
