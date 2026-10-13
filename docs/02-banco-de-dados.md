# Banco de Dados

> Complementa [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).

## Estado atual

As HUs 01, 03, 04 e **05** estão implementadas e validadas contra o
PostgreSQL do Supabase. Existem duas tabelas:

`usuario`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `BIGINT` | Identity, PK |
| `nome` | `VARCHAR(120)` | `NOT NULL` |
| `email` | `VARCHAR(180)` | `NOT NULL`, `UNIQUE` |
| `senha_hash` | `VARCHAR(255)` | `NOT NULL` — PBKDF2, nunca a senha em claro |
| `meta_estudo_semanal` | `INTEGER` | HU03, opcional — horas de estudo por semana |
| `objetivo_motivacao` | `VARCHAR(500)` | HU03, opcional — texto livre |
| `perfil_id` | `BIGINT` | `NOT NULL`, `FK → perfil(id)` — HU05 |

`perfil`

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `BIGINT` | Identity, PK |
| `nome` | `VARCHAR(20)` | `NOT NULL`, `UNIQUE` — `ADMIN`/`ALUNO` |
| `descricao` | `VARCHAR(120)` | opcional — rótulo legível |

Relacionamento **1:N** (`usuario.perfil_id → perfil.id`). As duas linhas
de `perfil` são semeadas pela migration; quem tenta gravar um `perfil_id`
inexistente é recusado pela chave estrangeira. A HU05 normalizou o que a
HU04 tinha como coluna de texto `usuario.perfil` — detalhes em
[`hu/05-estrutura-de-banco-de-dados.md`](hu/05-estrutura-de-banco-de-dados.md).

O restante do esquema de domínio (planner, edital, disciplina,
desempenho, questão, flashcard) permanece **adiado para as HUs 07–09**,
cujo conteúdo ainda não está definido no escopo — criá-lo agora seria
inventar entidade.

## Onde o banco vive

| Item | Decisão |
|---|---|
| Provedor | **Supabase Cloud** |
| Banco | PostgreSQL |
| Container local de Postgres | **Não** — decisão taken na Etapa 0 para não adicionar serviço além do necessário |

Por isso o `docker-compose.yml` do projeto tem **apenas 2 serviços**
(backend e frontend). Não há serviço de banco.

## Variáveis de ambiente

| Variável | Conteúdo |
|---|---|
| `DB_URL` | JDBC URL do PostgreSQL do Supabase, com `?sslmode=require` |
| `DB_USERNAME` | Usuário do banco (no pooler: `postgres.<ref-do-projeto>`) |
| `DB_PASSWORD` | Senha do banco |

Arquivos `.env` reais estão no `.gitignore` (linha 9) e **não devem ser
commitados**. `backend/.env.example` traz o modelo com placeholders vazios.

### O `.env` é carregado de verdade

O Spring Boot **não lê `.env` nativamente** — ele só lê `application.yml`,
variáveis de ambiente do processo e argumentos de linha de comando. Sem
configuração explícita, criar o `.env` não tem efeito e a aplicação falha
com `'url' must start with "jdbc"`.

O `application.yml` resolve isso com:

```yaml
spring:
  config:
    import: "optional:file:.env[.properties]"
```

O hint `[.properties]` é o que faz o Spring tratar um arquivo sem extensão
como properties. O prefixo `optional:` evita que a aplicação quebre em CI
ou numa máquina sem credencial local.

Resultado: para rodar, basta criar `backend/.env` e executar
`.\mvnw.cmd spring-boot:run`, sem exportar nada no terminal.

## Conexão

As credenciais saem do painel do projeto, em **Connect** → *Session pooler*
(com driver URI). O painel mudou de layout: a seção "Connection string"
não existe mais nas versões atuais.

### Pooler vs. conexão direta

| Opção | Host | Precisa liberar IP? |
|---|---|---|
| **Session pooler** | `aws-0-<região>.pooler.supabase.com:5432` | Não |
| Direct connection | `db.<ref>.supabase.co:5432` | Sim |

O **pooler** foi a escolha da validação: funciona sem mexer na whitelist de
IP do projeto.

### `sslmode=require` é obrigatório

O PostgreSQL do Supabase recusa conexão sem TLS. Sem esse parâmetro a
conexão falha com `no pg_hba.conf entry ... SSL off`. Ele já vem escrito
no `DB_URL` do `.env`.

## Migrations (Flyway)

A HU05 substituiu o `schema.sql` idempotente por migrations versionadas em
`backend/src/main/resources/db/migration`:

| Migration | Conteúdo |
|---|---|
| `V1__estrutura_inicial.sql` | baseline com a tabela `usuario` (como estava antes da HU05) |
| `V2__perfil_como_tabela.sql` | cria `perfil`, `usuario.perfil_id`, seed, backfill e drop da coluna antiga |

As mesmas migrations rodam no Supabase e no H2 dos testes.

### Baseline do banco já existente

O banco do Supabase já tinha a estrutura da V1 (criada pelo `schema.sql`
antigo). A aplicação sobe com `baseline-on-migrate: true` e
`baseline-version: 1`: nesse banco o Flyway registra a V1 como baseline e
aplica apenas a V2 em diante, sem recriar nada. Num banco vazio (o H2 dos
testes) as duas migrations rodam do zero.

No Spring Boot 4 a auto-configuração do Flyway saiu do jar do próprio
Flyway e passou a ser um módulo. Por isso a dependência é o
`spring-boot-starter-flyway`; apenas o `flyway-core` no classpath não
ativa o Flyway.

`ddl-auto: validate`: o Hibernate nunca cria nem altera tabela, apenas
reprova a inicialização se o banco e a entidade divergirem.

## O que NÃO fazer aqui

- Criar tabelas ou entidades antecipadamente para as HUs futuras
- Versionar credenciais reais
- Adicionar Redis, broker ou qualquer outro serviço