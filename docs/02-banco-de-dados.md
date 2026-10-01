# Banco de Dados

> Complementa [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).
> O **esquema** do banco é definido na **HU05 (Estruturação de Banco de
> Dados)** e não deve ser antecipado.

## Estado atual

**Nenhuma tabela, entidade ou migration existe nesta etapa.** Isso é
intencional: o escopo proíbe criar entidades de negócio antes da
necessidade, e a HU05 é justamente a HU que define a estrutura do banco.

Consequência prática: o backend sobe e o teste de contexto passa **sem**
conectar a nenhum banco, porque o `spring-boot-starter-data-jpa` foi
adiado para a HU05 e não há nenhuma dependência de persistência no
classpath ainda.

## Onde o banco vive

| Item | Decisão |
|---|---|
| Provedor | **Supabase Cloud** |
| Banco | PostgreSQL |
| Container local de Postgres | **Não** — decisão taken na Etapa 0 para não adicionar serviço além do necessário |

Por isso o `docker-compose.yml` do projeto tem **apenas 2 serviços**
(backend e frontend). Não há serviço de banco.

## Variáveis de ambiente

A conexão será ativada na HU05. As variáveis já estão documentadas em
`backend/.env.example`:

| Variável | Conteúdo |
|---|---|
| `DB_URL` | JDBC URL do PostgreSQL do Supabase |
| `DB_USERNAME` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |

Arquivos `.env` reais estão no `.gitignore` e **não devem ser
commitados**. Nenhum valor real foi escrito no repositório — apenas
placeholders vazios.

## Strings de conexão

As credenciais do Supabase são obtidas no painel do projeto
(*Project Settings → Database*). A senha do banco não é a senha de login
do usuário do Supabase — são coisas distintas.

Para conectar a um banco do Supabase via JDBC, o host e a porta precisam
ser tratados conforme a região do projeto. Esse detalhe será registrado
aqui quando a HU05 for implementada.

## Migrations

A ferramenta de versionamento de esquema (**Flyway**) foi
**adiada para a HU05**, junto com a primeira migration. Não faz sentido
versionar um esquema que ainda não existe.

## O que NÃO fazer aqui

- Criar tabelas ou entidades antecipadamente
- Definir o esquema de domínio sem a HU05
- Adicionar Redis, broker ou qualquer outro serviço
- Versionar credenciais reais