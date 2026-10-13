# HU05 — Estruturação de Banco de Dados

**Status:** Concluída
**Dependências:** Etapa 0

## Objetivo

Definir e criar a estrutura de dados da plataforma no PostgreSQL do
Supabase.

## Critérios de aceite

Extraídos do documento acadêmico da HU05:

1. Tabelas de usuário e perfis criadas.
2. Relacionamentos entre tabelas definidos.
3. Senhas armazenadas com criptografia.

Cada um virou um teste em `EstruturaDeBancoTest`.

## O que foi entregue

### Tabela `perfil` e relacionamento (critérios 1 e 2)

Antes da HU05 o perfil de acesso era a coluna de texto `usuario.perfil`
(HU04). A HU05 normalizou o dado em uma tabela própria, com
relacionamento explicitado no banco:

| Tabela | Coluna | Tipo | Observação |
|---|---|---|---|
| `perfil` | `id` | `BIGINT` | Identity, PK |
| `perfil` | `nome` | `VARCHAR(20)` | `NOT NULL`, `UNIQUE` — `ADMIN`/`ALUNO` |
| `perfil` | `descricao` | `VARCHAR(120)` | opcional — rótulo legível |
| `usuario` | `perfil_id` | `BIGINT` | `NOT NULL`, `FK → perfil(id)` |

Relacionamento **1:N**: um perfil tem muitos usuários; cada usuário tem
um perfil. As duas linhas de `perfil` (`ADMIN`, `ALUNO`) são semeadas
pela migration; a lista não é editável pela API.

A coluna `usuario.perfil` (texto) foi **removida** depois do backfill, que
converteu os valores existentes em `perfil_id`. Com isso o `CHECK` que a
HU04 havia adiado deixou de ser necessário: valor inválido passa a ser
impossível pela `FK` + `UNIQUE`.

Não há outras tabelas de domínio nesta HU: as entidades de planner,
edital, disciplina, desempenho, questão e flashcard dependem das HUs 07–09,
que ainda não definiram seu conteúdo. Criá-las agora seria inventar.

### Senhas (critério 3)

Atendido desde a HU01 e mantido: a senha é gravada como **hash** PBKDF2-
HMAC-SHA256 em `usuario.senha_hash`, com salt por senha e comparação em
tempo constante. O critério pede "criptografia"; a leitura correta é "não
guardar a senha em claro", e o hash é a prática adequada (criptografia
reversível seria um defeito).

## Versionamento com Flyway

O `schema.sql` idempotente das HUs 01/03/04 foi substituído por migrations
versionadas em `backend/src/main/resources/db/migration`:

| Migration | Conteúdo |
|---|---|
| `V1__estrutura_inicial.sql` | baseline: a tabela `usuario` como estava antes da HU05 |
| `V2__perfil_como_tabela.sql` | cria `perfil`, `usuario.perfil_id`, seed, backfill e drop da coluna antiga |

O banco do Supabase já tinha a estrutura da V1 (criada pelo `schema.sql`),
então a aplicação sobe com `baseline-on-migrate: true` e
`baseline-version: 1`: nesse banco o Flyway registra a V1 como baseline e
aplica apenas a V2 em diante. Num banco vazio (o H2 dos testes) as duas
migrations rodam do zero.

> No Spring Boot 4 a auto-configuração do Flyway saiu do jar do próprio
> Flyway e virou módulo. Por isso a dependência é o
> `spring-boot-starter-flyway`; apenas o `flyway-core` no classpath não
> seria suficiente (o Flyway seria ignorado).

## Escopo técnico

### Backend

- `pom.xml` — `spring-boot-starter-flyway` + `flyway-database-postgresql`.
- `db/migration/V1…`, `V2…` — migrations; `schema.sql` removido.
- `application.yml` (main e teste) — bloco `spring.flyway.*` no lugar de
  `spring.sql.init.*`; `ddl-auto: validate` mantido.
- `usuario/Perfil` — entidade do catálogo (`ADMIN`/`ALUNO`); `PerfilRepository`.
- `usuario/Usuario` — `perfil` virou `@ManyToOne Perfil` (coluna `perfil_id`);
  `getPerfil()` devolve o **nome**, preservando o contrato das HUs 02/04, e
  `getPerfilEntidade()` expõe o relacionamento.
- `usuario/CadastroUsuarioService` — todo cadastro resolve e vincula o perfil
  `ALUNO` da tabela (antes era a string fixa `'ALUNO'`).

O contrato HTTP **não mudou**: login, `/me` e a área admin continuam
devolvendo `perfil` como texto.

### Frontend

Sem mudança: a API continua devolvendo `perfil` como texto.

## Decisões

| Decisão | Escolha |
|---|---|
| `perfis` é o perfil de acesso | Tabela `perfil` (`ADMIN`/`ALUNO`), não os dados do perfil da HU03 |
| Relacionamento | 1:N (usuário tem um perfil; perfil tem muitos usuários) |
| Coluna `perfil` (texto) | Removida após o backfill para `perfil_id` |
| `CHECK` no perfil | Desnecessário: `FK` + `UNIQUE` cobrem |
| Senhas | Mantido PBKDF2-HMAC-SHA256 (não invalidar hashes existentes) |
| Migração | Flyway, com baseline do banco do Supabase |
| Entidades de domínio (HU07–09) | Fora desta HU; sem conteúdo definido |

## Testes

| Suíte | Testes |
|---|---|
| `EstruturaDeBancoTest` (MockMvc/JdbcTemplate + H2, novos) | 6 |
| Suítes das HUs 01–04 (ajustadas para o novo esquema) | 47 |

`EstruturaDeBancoTest` cobre: tabelas `usuario`/`perfil` existem; catálogo
com exatamente `ADMIN`/`ALUNO`; cadastro vincula `ALUNO` pela `perfil_id`;
relacionamento carregado pela entidade; `FK` recusa perfil inexistente;
senha gravada como hash PBKDF2.

---

**Próximo passo:** HU06 (Interface de Usuário).
