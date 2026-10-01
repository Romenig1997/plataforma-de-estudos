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

### Adiadas de propósito

| Dependência | Entra na | Motivo do adiamento |
|---|---|---|
| Flyway (migrations) | HU05 | A HU01 tem um único `schema.sql`; versionar um schema com uma tabela não paga o custo de rodar migrations |
| BCrypt (via `spring-security-crypto`) | — | **Não entrou.** O hash de senha da HU01 usa PBKDF2-HMAC-SHA256 com `javax.crypto`, que já vem no JDK e dispensa a dependência. A HU02 reaproveita o mesmo PBKDF2: trocar o algoritmo invalidaria toda senha já gravada |

## Dependências do frontend

Apenas os defaults do Vite. **Nenhuma biblioteca adicional** foi
instalada nesta etapa:

| Pacote | Motivo |
|---|---|
| `react`, `react-dom` | Stack definida |
| `vite`, `@vitejs/plugin-react` | Ferramenta de build e dev server |
| `typescript` | Stack definida |
| `eslint` + plugins | Qualidade de código (stack pedida para validação) |
| `globals`, `@eslint/js`, `typescript-eslint` | Dependências de peer do lint |
| `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` (dev) | Entraram na **HU02**. Critérios como "logout encerra a sessão" e "não abrir a área autenticada depois do logout" são comportamento de navegador; sem runner não haveria como automatizá-los. Versões fixadas em `package.json` para reprodutibilidade |

**Deliberadamente ausentes:**

- **Router** — a navegação da HU02 é por estado, em `App.tsx`. Entra na HU06,
  junto com o design system
- **Biblioteca de CSS ou de componentes** — a decisão de design system pertence
  à HU06
- **Cliente HTTP dedicado (axios, react-query)** — o `fetch` nativo do
  navegador cobre HU01 e HU02. Um wrapper se justifica quando houver
  interceptadores, retry ou cache (HU08+)

Pastas como `pages/`, `components/` e `hooks/` serão criadas quando houver
código que as use. Pastas vazias não são versionadas pelo Git.

## Configuração

Variáveis de ambiente documentadas em `.env.example` na raiz de cada
projeto. Arquivos `.env` reais estão no `.gitignore`.

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

O `schema.sql` roda em toda inicialização (`spring.sql.init.mode: always`) e
o Hibernate roda em `validate`. Divergência entre SQL e entidade reprova a
inicialização em vez de subir com estrutura errada.

### Verificação de contrato sem Supabase

O perfil `h2runtime` sobe a aplicação real (Tomcat + HTTP) contra o H2 em
memória, para validar o endpoint com `curl` sem Docker e sem credenciais:

```
.\mvnw.cmd -Ph2runtime spring-boot:run
```

Ele não altera a configuração de produção: apenas coloca o driver H2 no
classpath de runtime e aplica o `application.yml` de teste.

## Segurança

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

`anyRequest().authenticated()` faz endpoint novo nascer protegido. Perfis
ADMIN/ALUNO são da HU04 — hoje não há regra por perfil.

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