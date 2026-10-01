# HU05 — Estruturação de Banco de Dados

**Status:** Não iniciada
**Dependências:** Etapa 0

## Objetivo

Definir e criar a estrutura de dados da plataforma no PostgreSQL do
Supabase.

## Critérios de aceite

> A definir — extraídos do documento acadêmico da HU05. Não foram
> inventados aqui.

## Escopo técnico previsto

- Definição do esquema (tabas, chaves primárias, relacionamentos)
- Configuração do `DataSource` no backend (variáveis `DB_*`)
- Entidades JPA correspondentes ao esquema
- Versionamento de esquema com Flyway (adiado na Etapa 0)
- Substituição do placeholder de `App.tsx` por dados reais da API

## Dependências adiadas até esta HU

| Item | Motivo do adiamento |
|---|---|
| `spring-boot-starter-data-jpa` | Sem `spring.datasource.url`, o `DataSourceAutoConfiguration` do Spring Boot 4.1.1 tenta criar o `HikariDataSource` mesmo sem entidades e falha com `Failed to determine a suitable driver class`. Confirmado por build na Etapa 0. |
| Flyway | Não há esquema para versionar antes |
| `application.yml` com `spring.datasource.*` | Ativar sem esquema exigiria conexões desnecessárias na Etapa 0 |

## Ponto a confirmar

O conjunto de entidades de domínio não está definido no escopo
disponível. Será levantado aqui antes da implementação.

---

**Próximo passo:** definir as entidades e o esquema antes de
implementar.