# Banco de Dados

> Complementa [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).

## Estado atual

A **HU01 (Cadastro de Usuários)** está implementada e validada contra o
PostgreSQL do Supabase. Existe a tabela `usuario`:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `BIGINT` | Identity, PK |
| `nome` | `VARCHAR(120)` | `NOT NULL` |
| `email` | `VARCHAR(180)` | `NOT NULL`, `UNIQUE` |
| `senha_hash` | `VARCHAR(255)` | `NOT NULL` — PBKDF2, nunca a senha em claro |

O DDL fica em `backend/src/main/resources/schema.sql`, é idempotente e
compartilhado com os testes (que rodam em H2 em modo de compatibilidade
PostgreSQL). Detalhes em
[`hu/01-cadastro-de-usuarios.md`](hu/01-cadastro-de-usuarios.md).

O restante do esquema de domínio (planner, edital, disciplina,
desempenho, questão, flashcard) permanece **adiado para a HU05**, conforme o
escopo.

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

## Migrations

O **Flyway** continua **adiado para a HU05**. A HU01 tem um único
`schema.sql` idempotente; versionar um schema com uma tabela só não paga o
custo de rodar migrations. Quando a HU05 adicionar tabelas e precisar de
histórico de evolução, aí sim a ferramenta entra.

`ddl-auto: validate` no meantime: o Hibernate nunca cria nem altera tabela,
apenas reprova a inicialização se o SQL e a entidade divergirem.

## O que NÃO fazer aqui

- Criar tabelas ou entidades antecipadamente para as HUs futuras
- Versionar credenciais reais
- Adicionar Redis, broker ou qualquer outro serviço