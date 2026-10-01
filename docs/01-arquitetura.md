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

### Adiadas de propósito

| Dependência | Entra na | Motivo do adiamento |
|---|---|---|
| `spring-boot-starter-data-jpa` | HU05 | **Comprovado por build.** Sem `spring.datasource.url`, o `DataSourceAutoConfiguration` do Spring Boot 4.1.1 tenta criar o `HikariDataSource` mesmo sem nenhuma entidade e falha com `Failed to determine a suitable driver class`. O starter derrubava o teste de contexto na Etapa 0 e, sem entidades, não tem função útil aqui. |
| `spring-boot-starter-security` | HU02 / HU04 | O `SecurityFilterChain` padrão **bloqueia todos os endpoints**. Adiar mantém o esqueleto verificável e não implementa autenticação antes da hora. |
| `jjwt` | HU02 / HU04 | Imediatamente na HU02, junto com a autenticação |
| Flyway (migrations) | HU05 | Não há esquema de banco para versionar ainda |

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

- **Router** — entra na HU01/HU06, quando houver navegação real
- **Biblioteca de CSS ou de componentes** — a decisão de design system
  pertence à HU06
- **Cliente HTTP dedicado** — entra na HU01, na primeira chamada à API

Pastas como `pages/`, `components/` e `hooks/` serão criadas quando houver
código que as use. Pastas vazias não são versionadas pelo Git.

## Configuração

Variáveis de ambiente documentadas em `.env.example` na raiz de cada
projeto. Arquivos `.env` reais estão no `.gitignore`.

O backend sobe sem nenhuma variável na Etapa 0, porque ainda não há
entidades nem consultas — o Spring Boot não cria `DataSource` nem
`EntityManagerFactory` quando não há URL configurada.

## Segurança

Planejada para HU02 (autenticação) e HU04 (perfis de acesso):
Spring Security + JWT. Nada foi implementado nesta etapa.