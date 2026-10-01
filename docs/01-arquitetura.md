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

### Adiadas de propósito

| Dependência | Entra na | Motivo do adiamento |
|---|---|---|
| `spring-boot-starter-security` | HU02 / HU04 | O `SecurityFilterChain` padrão **bloqueia todos os endpoints**. Adiar mantém o esqueleto verificável e não implementa autenticação antes da hora. |
| `jjwt` | HU02 / HU04 | Imediatamente na HU02, junto com a autenticação |
| Flyway (migrations) | HU05 | A HU01 tem um único `schema.sql`; versionar um schema com uma tabela não paga o custo de rodar migrations |
| BCrypt (via `spring-security-crypto`) | — | **Não entrou.** O hash de senha da HU01 usa PBKDF2-HMAC-SHA256 com `javax.crypto`, que já vem no JDK e dispensa a dependência |

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

**Deliberadamente ausentes:**

- **Router** — ainda não há navegação real; a HU01 é uma única tela. Entra
  quando houver a segunda rota (HU06).
- **Biblioteca de CSS ou de componentes** — a decisão de design system
  pertence à HU06
- **Cliente HTTP dedicado** — o `fetch` nativo do navegador cobre a HU01
  inteiro. Um wrapper só se justificar quando houver interceptadores,
  retry ou cancelamento (HU08+)

Pastas como `pages/`, `components/` e `hooks/` serão criadas quando houver
código que as use. Pastas vazias não são versionadas pelo Git.

## Configuração

Variáveis de ambiente documentadas em `.env.example` na raiz de cada
projeto. Arquivos `.env` reais estão no `.gitignore`.

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

Autenticação planejada para HU02 e perfis de acesso para HU04:
Spring Security + JWT. **Nada implementado até aqui** — a HU01 cadastro
usuários é um endpoint público, como exige o fluxo de criação de conta.

O que a HU01 já protege:

- Senha nunca gravada em claro: PBKDF2-HMAC-SHA256 com salt por senha
  (`CodificadorDeSenha`).
- Senha e hash nunca voltam na resposta — a resposta é construída
  explicitamente, não por serialização da entidade, para o hash não poder
  vazar por acidente.
- Comparação de senha em tempo constante.

CORS liberado apenas para `http://localhost:5173` (dev server do Vite) e
apenas para `POST` em `/api/**`.