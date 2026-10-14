# Arquitetura

> Decisões técnicas e justificativas. Complementa
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).

## Visão geral

Monólito modular com frontend e backend separados:

```
Navegador
   │  HTTP
   ▼
frontend/ (React + TypeScript, servido por Vite em dev / nginx em prod)
   │  REST + JSON
   ▼
backend/ (Spring Boot — API REST)
   │  JDBC
   ▼
PostgreSQL (Supabase Cloud)
```

## Por que esse formato

O escopo não define arquitetura de microsserviços, filas ou cache. A regra
de escopo proíbe inventar o que não está definido, então a estrutura mais
simples que atende às 9 HUs é a adotada. Um monólito é também o formato
mais fácil de revisar e de executar por uma avaliadora.

## Stack e versões

| Camada | Escolha | Versão |
|---|---|---|
| Frontend | React | 19.3.0 |
| Frontend | TypeScript | 6.0.3 |
| Frontend | Vite | 8.3.2 |
| Backend | Spring Boot | 4.1.1 |
| Backend | Java (LTS) | 17 |
| Build | Maven (via Wrapper) | 3.9.16 |
| Banco | PostgreSQL (Supabase Cloud) | — |

### Por que TypeScript 6.0.3 e não 7.0.2

A versão `latest` do TypeScript no npm é a **7.0.2**, mas o
`typescript-eslint` usado no lint declara suporte a
`typescript >=4.8.4 <6.1.0`. Usar a 7.0.2 faz o `npm install` falhar por
conflito de peer dependency. A **6.0.3** é a maior versão estável dentro da
faixa compatível.

### Por que Maven Wrapper

`mvnw` e `mvnw.cmd` são versionados, então toda pessoa que clonar o projeto
usa exatamente a mesma versão do Maven (3.9.16), sem precisar instalar
nada. Também garante reprodutibilidade para a avaliação.

## Dependências do backend

### Incluídas na Etapa 0

| Dependência | Justificativa |
|---|---|
| `spring-boot-starter-web` | Base de toda HU — é a API REST |
| `spring-boot-starter-validation` | Validação de formulário da HU01 |
| `org.postgresql` (runtime) | Driver JDBC para o Supabase |
| `spring-boot-starter-test` | Testes de aceite das HUs |
| `spring-boot-starter-webmvc-test` | No Spring Boot 4 o suporte a teste de web foi modularizado e saiu do `spring-boot-starter-test`. Sem este starter o `AutoConfigureMockMvc` nem existe no classpath. |
| `spring-boot-starter-data-jpa` | Entrou na **HU01**: passou a existir entidade a persistir. Na Etapa 0 ele derrubava o teste de contexto (ver adiada abaixo). |
| `com.h2database:h2` (escopo `test`) | Permite validar os critérios de aceite sem Docker e sem credenciais do Supabase. O banco de produção continua sendo o PostgreSQL. |
| `spring-boot-starter-security` | Entrou na **HU02**: autenticação. O `SecurityFilterChain` padrão **bloqueia todos os endpoints**, então adiar era obrigatório na Etapa 0. |
| `jjwt-api`, `jjwt-impl`, `jjwt-jackson` 0.12.6 | Entraram na **HU02**: emissão e validação do token. A versão é fixada no `pom.xml` porque o Spring Boot não gerencia esta biblioteca. |
| `spring-boot-starter-flyway` + `flyway-database-postgresql` | Entraram na **HU05**: o esquema passou a ser versionado por migrations. No Spring Boot 4 a auto-configuração do Flyway virou módulo próprio, então o starter é obrigatório — só o `flyway-core` no classpath não bastaria. |
| `org.apache.pdfbox:pdfbox` 3.0.4 | Entrou na **HU07** (incremento A): extração do texto do PDF de edital, página por página. Em vez de `PDDocument.load(byte[])` (removido na 3.x), usa `org.apache.pdfbox.Loader.loadPDF(byte[])`; fontes padrão via `PDType1Font(Standard14Fonts.FontName.HELVETICA)` |

### Adiadas de propósito

| Dependência | Entra na | Motivo do adiamento |
|---|---|---|
| BCrypt (via `spring-security-crypto`) | — | **Não entrou.** O hash de senha da HU01 usa PBKDF2-HMAC-SHA256 com `javax.crypto`, que já vem no JDK e dispensa a dependência. A HU02 reaproveita o mesmo PBKDF2: trocar o algoritmo invalidaria toda senha já gravada |

## Dependências do frontend

| Pacote | Motivo |
|---|---|
| `react`, `react-dom` | Stack definida |
| `vite`, `@vitejs/plugin-react` | Ferramenta de build e dev server |
| `typescript` | Stack definida |
| `eslint` + plugins | Qualidade de código (stack pedida para validação) |
| `globals`, `@eslint/js`, `typescript-eslint` | Dependências de peer do lint |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` (dev) | Entraram na **HU02**. Critérios como "logout encerra a sessão" e "não abrir a área autenticada depois do logout" são comportamento de navegador; sem runner não haveria como automatizá-los. Versões fixadas em `package.json` para reprodutibilidade |
| `react-router-dom` 7.18.4 | Entrou na **HU06**: rotas `/login`, `/cadastro`, `/app`, `/perfil`, `/admin` e `RotaProtegida` (sem token → `/login`). Substituiu a navegação por estado da HU02 |
| `@playwright/test` 1.64.0 + `@axe-core/playwright` 4.13.0 (dev) | Entraram na **HU06**: teste ponta a ponta de responsividade (critério 1) e auditoria de contraste/axe (critério 2), que o jsdom não alcança |

**Deliberadamente ausentes:**

- **Biblioteca de CSS ou de componentes** — decidido na HU06: **CSS puro com
  tokens** em `:root` (`src/index.css`) e componentes base próprios
  (`src/componentes/`). Tailwind/MUI não entraram porque a interface tem
  poucas telas e formulários; a camada extra de estilo não é pedida pelo
  escopo
- **Cliente HTTP dedicado (axios, react-query)** — o `fetch` nativo do
  navegador cobre HU01 e HU02. Um wrapper se justifica quando houver
  interceptadores, retry ou cache (HU08+)
- **`eslint-plugin-jsx-a11y`** — não suporta o ESLint 10 (peer depende de
  `^9`); a acessibilidade é coberta pela auditoria axe no Playwright

Pastas como `pages/`, `components/` e `hooks/` serão criadas quando houver
código que as use. Pastas vazias não são versionadas pelo Git.

## Configuração

Variáveis de ambiente documentadas em `.env.example` na raiz de cada
projeto. Arquivos `.env` reais estão no `.gitignore`.

**A partir da HU07 o backend também exige `IA_API_KEY`** — mas só quando
`plataforma.ia.tipo=rest` (o padrão). O bloco `plataforma.ia` tem valor
padrão em `application.yml` e pode ser sobrescrito por env:

| Variável | Padrão | Uso |
|---|---|---|
| `PLATAFORMA_IA_TIPO` | `rest` | `rest` = API real, `manual` = revisão pelo ADMIN sem chamadas externas, `fake` = árvore determinística (usado na suíte de testes) |
| `IA_API_URL` | `https://api.openai.com/v1/chat/completions` | Endpoint *chat completions* |
| `IA_MODELO` | `gpt-4o-mini` | Modelo da extração |
| `IA_API_KEY` | (vazio) | Segredo da API — só obrigatória com `tipo=rest` |

**A partir da HU02 o backend também exige `JWT_SECRET`**, com no mínimo 32
bytes (HS256 usa chave de 256 bits). Não há valor padrão: a aplicação não sobe
sem a variável, e não sobe com a chave curta. Gere com `openssl rand -base64
48`. Trocar o segredo invalida todos os tokens já emitidos — é o comportamento
esperado.

**A partir da HU01 o backend exige `DB_URL`, `DB_USERNAME` e
`DB_PASSWORD`.** Sem elas a aplicação não sobe: passou a existir entidade a
persistir, então o `DataSource` é obrigatório. Na Etapa 0 não havia
entidade e o Spring Boot não criava `DataSource` nem `EntityManagerFactory`
sem URL configurada — por isso o teste de contexto funcionava sem variáveis.

A partir da HU05 o esquema é versionado com **Flyway** (migrations em
`backend/src/main/resources/db/migration`, no lugar do `schema.sql`). O
banco existente do Supabase é tratado por `baseline-on-migrate` +
`baseline-version: 1`. O Hibernate roda em `validate`: divergência entre
banco e entidade reprova a inicialização em vez de subir com estrutura
errada.

### Jackson 3 (Spring Boot 4.1.1)

O Spring Boot 4 auto-configura o **Jackson 3** — pacotes `tools.jackson.core`
e `tools.jackson.databind`, e não mais `com.fasterxml.jackson`. Todo código
novo (serviços, testes) importa `tools.jackson.databind.ObjectMapper` e
`tools.jackson.core.JacksonException`. A biblioteca `jjwt-jackson` (HU02)
ainda arrasta o Jackson 2.x só no runtime, então **não importar
`com.fasterxml.jackson`** no código da aplicação.

### Importação de editais (HU07, incremento A)

O upload é síncrono: o ADMIN envia o PDF (`multipart`), o backend valida
`%PDF`, hash SHA-256 e o limite de 10 MB, extrai o texto por página (PDFBox)
e chama a IA; o resultado vira `ImportacaoEdital` com a árvore em
`conteudoEmJson` (JSON) e os bytes em `bytea`. A aprovação é transacional:
revalida a árvore, persiste `Edital` + `Disciplina`/`Conteudo` +
`Concurso`/`Cargo` e marca a importação como `APROVADO`. O catálogo
(`GET /api/editais`) é somente leitura do que passou pela aprovação.

```
extracao/LeitorDePdf (PDFBox) ──▶ prompt ──▶ ExtratorDeEditalIA
              ▲                                    │ chat completions
              │                                    ▼
   ValidadorDeEditalExtraido ◀──── EditalExtraido (record)
```

`ExtratorDeEditalIA` é uma interface com duas implementações selecionadas por
`@ConditionalOnProperty` em `FabricaDeExtratorIa`: `rest` (RestClient contra a
URL configurada, removendo cercas `` ```json ``` ``) e `fake` (árvore
determinística, usada nos testes). A resposta textual da IA é convertida com
o ObjectMapper do Jackson 3 e validada por `ValidadorDeEditalExtraido` antes
de ser guardada.

### Verificação de contrato sem Supabase

O perfil `h2runtime` sobe a aplicação real (Tomcat + HTTP) contra o H2 em
memória, para validar o endpoint com `curl` sem Docker e sem credenciais:

```
.\mvnw.cmd -Ph2runtime spring-boot:run
```

Ele não altera a configuração de produção: apenas coloca o driver H2 no
classpath de runtime e aplica o `application.yml` de teste.

## Segurança

### Planner semanal (HU07-B)

Geração determinística sem chamadas de IA: pesos 1/2/3 e distribuição
inteira pelo maior resto, desempate por id de disciplina. O backend recebe
edital, meta e prioridades; identidade vem exclusivamente da sessão.
Um plano atual por usuário. A geração bloqueia a linha do usuário até o
commit para serializar gravações simultâneas, e as tabelas garantem
unicidade. Meta e distribuição são salvas no plano sem modificar o perfil.
Conteúdos e páginas são lidos do edital aprovado. A V5 cria as duas tabelas.

### Autenticação (HU02, implementada)

Spring Security com sessão **sem estado** (`STATELESS`): não há `HttpSession`. O
`FiltroDeTokenJwt` lê o cabeçalho `Authorization: Bearer` e publica a
identidade no `SecurityContext`. Token ausente ou inválido **não** bloqueia a
requisição — o filtro segue sem autenticação e quem decide é o
`authorizeHttpRequests`. É isso que mantém login e cadastro funcionando mesmo
com um token velho no navegador.

| Regra | Valor |
|---|---|
| `POST /api/usuarios` | público (HU01) |
| `POST /api/auth/login` | público |
| `/error` | público |
| qualquer outra coisa | exige token |

`anyRequest().authenticated()` faz endpoint novo nascer protegido. As regras
por perfil vieram na HU04 (`GET /api/admin/usuarios` → `hasRole('ADMIN')`,
matriz em `hu/04-perfis-de-acesso-diferenciados.md`) e a HU07-A estendeu a
mesma regra a todo `/api/admin/editais/**` (importar, listar, revisar,
aprovar, rejeitar, reprocessar e baixar o PDF da importação — todos
`ADMIN`). O catálogo dos editais aprovados, `GET /api/editais`, é o que o
planner consumirá: autenticado para qualquer perfil, fora de `/api/admin`
de propósito — ALUNO lê, mas não importa nem aprova.

O token leva **apenas o `sub` com o id**, mais `iss`, `iat` e `exp`. Nome e
e-mail são lidos do banco em `/api/auth/me`: o JWT não trafega dado pessoal.

**Logout sem endpoint.** Com sessão sem estado o servidor não guarda lista de
tokens e não tem como revogar um token já entregue; revogação real exigiria
tabela nova, que é esquema da HU05. O logout da HU02 é, portanto, o navegador
descartando o token do `sessionStorage`.

**CSRF desligado** — é a decisão correta para esta configuração: CSRF existe
para impedir que um site terceiro faça o navegador reenviar a credencial de um
cookie. Não há cookie de sessão; a credencial viaja num cabeçalho que a própria
página precisa pedir.

401 e 403 saem em JSON, no mesmo formato de erro da HU01. Sem o handler, o
Spring responderia com HTML ou corpo vazio e o frontend receberia algo que não
sabe ler.

### O que já estava protegido (HU01)

- Senha nunca gravada em claro: PBKDF2-HMAC-SHA256 com salt por senha
  (`CodificadorDeSenha`). A HU02 reusa o mesmo codificador.
- Senha e hash nunca voltam na resposta — a resposta é construída
  explicitamente, não por serialização da entidade, para o hash não poder
  vazar por acidente.
- Comparação de senha em tempo constante.
- E-mail inexistente e senha incorreta devolvem a **mesma** resposta, para não
  revelar quais e-mails têm conta.

### CORS

Liberado apenas para `http://localhost:5173` (dev server do Vite), com `GET`,
`POST`, `OPTIONS`, `Content-Type` e `Authorization` — este último cabeçalho só
passou a ser usado na HU02.

## Cronograma semanal

GeradorCronograma é uma regra pura: valida intervalos, distribui quotas do plano
entre janelas sem sobreposição e rotaciona tópicos finais em sessões de até
60 minutos. CronogramaService guarda uma agenda por usuário em transação,
com disponibilidade e atividades; a versão temporal do plano detecta mudanças.
A tela `/cronograma` permite editar horários e apresenta atividades por data.
Não utiliza chamadas de IA.

## Dashboard — HU08

DashboardService agrega o plano e registros da sessão em transação de leitura,
conta tópicos finais e calcula percentuais ponderados. Gravação bloqueia a linha
do usuário para evitar registros duplicados concorrentes. Dados do horário local
são usados somente para filtrar próximas atividades. Interface recarrega a
agregação após salvar, com tratamento de sessão, rede e validação.


Correção vigente da HU08 (13/10/2026): aluno informa apenas conclusão do
conteúdo. Totais manuais de questões/acertos não são editáveis nem utilizados
pelo dashboard. Desempenho depende de respostas corrigidas pelo sistema;
módulo de questões em standby por pedido do responsável. As colunas existentes
da V7 foram preservadas, sem nova migration. HU08 parcial nesse requisito.

## HU09

Motor puro AnalisadorDesempenho consome resultados internos por disciplina.
Controller GET autenticado deriva exclusivamente da sessão via DashboardService.
Fonte integrada às respostas corrigidas no servidor por usuário e tópico. Comparações
usam taxas ponderadas antes de arredondar; não há endpoint de totais manuais,
IA, novos dados de teste em produção ou migration adicional.


### Atualização vigente — questões validadas em 13/10/2026

V8 aplicada no Supabase e backend iniciado/validado. Resultados de respostas
corrigidas integram HU08 e HU09; os totais manuais antigos não são utilizados.
Quatro questões originais foram revisadas/publicadas; teste real de conta
exclusiva validou erro/acerto, agregação, comparação e recomendação, e a conta
foi removida. 122 testes backend, 126 frontend, 19 E2E, build/lint limpos.
Limite da revisão automática deixou de ser bloqueio. Próxima pendência: HU03 foto.

## Foto de perfil — HU03

Recurso binário protegido /api/perfil/foto separado de JSON /api/perfil.
NormalizadorFoto verifica PNG/JPEG e dimensões antes de decodificar, reduz
a 512px e recodifica PNG. Tabela independente evita carregar imagem nas
consultas comuns de usuários; locks da conta serializam alterações da foto.
Frontend usa blob URLs, prévia local e upload multipart; remoção autenticada.
