# HU02 — Sistema de Autenticação

**Status:** Não iniciada
**Dependências:** HU01

## Objetivo

Permitir que um usuário cadastrado acesse a plataforma com segurança.

## Critérios de aceite

> A definir — extraídos do documento acadêmico da HU02. Não foram
> inventados aqui.

## Escopo técnico previsto

- `spring-boot-starter-security` (adiado na Etapa 0 exatamente por isso)
- Emissão e validação de JWT (`jjwt`)
- Endpoint de login
- Filtro de autenticação nas requisições
- Tela de login no frontend

## Nota

O `SecurityFilterChain` padrão do Spring Security bloqueia todos os
endpoints. Por isso a dependência foi adiada na Etapa 0 — instalá-la antes
exigiria já escrever regra de autorização, que é a HU04.

---

**Próximo passo:** extrair os critérios de aceite do documento
acadêmico antes de implementar.