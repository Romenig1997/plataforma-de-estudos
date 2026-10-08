# HU03 — Gerenciamento de Perfis

**Status:** Concluída
**Dependências:** HU01

## Objetivo

Permitir que o usuário mantenha as informações do próprio perfil.

## Critérios de aceite

Confirmados com o responsável antes da implementação — a regra de escopo
proíbe inventar o que o documento acadêmico não define.

1. Usuário autenticado lê o próprio perfil (`GET /api/perfil`).
2. Usuário edita nome, e-mail, meta de estudo semanal e objetivo e salva
   (`PUT /api/perfil`); alterações persistem entre sessões.
3. Validação: nome obrigatório, e-mail válido e não duplicado, meta
   numérica entre 1 e 168 horas, objetivo até 500 caracteres — erros no
   formato `RespostaDeErro`, com o campo indicado.
4. Sem token → 401; no frontend, sessão expirada volta ao login.
5. Tela com estados de carregamento, sucesso, erro por campo e erro de rede.
6. Troca de senha **fora** do escopo (decisão do responsável).

## Campos do perfil

| Campo | Coluna | Tipo | Obrigatório |
|---|---|---|---|
| Nome | `nome` (HU01) | `VARCHAR(120)` | Sim |
| E-mail | `email` (HU01) | `VARCHAR(180) UNIQUE` | Sim |
| Meta de estudo semanal | `meta_estudo_semanal` (nova) | `INTEGER` — horas/semana, 1–168 | Não |
| Objetivo / motivação | `objetivo_motivacao` (nova) | `VARCHAR(500)` | Não |

Os dois campos novos são opcionais: `null` significa "não preenchido", e a
API devolve `null` em vez de inventar valor padrão.

## Escopo técnico

### Backend

- `schema.sql`: `ALTER TABLE usuario ADD COLUMN IF NOT EXISTS ...` —
  idempotente, roda tanto no Supabase quanto no H2 dos testes.
- `Usuario.java`: dois campos novos + `atualizarPerfil(...)`. A senha não
  passa por aqui.
- Pacote `perfil/`:
  - `PerfilController` — `GET` e `PUT /api/perfil`.
  - `PerfilService` — lê/grava via `UsuarioRepository`; identidade vem do
    `SecurityContext` (mesmo padrão de `AutenticacaoService.sessaoAtual()`).
  - `dto/PerfilResponse`, `dto/AtualizaPerfilRequest` (`@Valid`).

### Frontend

- `perfil.ts` — `buscarPerfil`, `salvarPerfil` e os mesmos erros tipados de
  `sessao.ts` (o leitor de erros da API foi exportado de lá).
- `TelaPerfil.tsx` — formulário com validação local espelhando a API,
  estados de carregamento/sucesso/erro, e 401 que encerra a sessão.
- `TelaAutenticada.tsx` — botão "Editar perfil" alterna para a tela de
  perfil (sem router; HU06). Ao voltar, `/api/auth/me` é relido.

## Decisões

| Decisão | Escolha |
|---|---|
| Recurso | `GET/PUT /api/perfil`, separado de `/api/auth/me` (HU02) |
| E-mail editável | Sim; normalizado (trim + minúsculas) como na HU01 |
| E-mail do próprio usuário | Não conta como duplicado (evita 409 ao salvar sem trocar) |
| Troca de senha | Fora do escopo, decisão do responsável |
| Campos opcionais | `null` no banco, `''` no formulário |
| Regra por perfil (ADMIN/ALUNO) | **Não** — é a HU04 |
| Router | Não — troca de componente por estado, como as demais telas |

## Testes

| Suíte | Testes |
|---|---|
| `PerfilTest` (MockMvc + H2) | 12 |
| `perfil.test.ts` | 7 |
| `TelaPerfil.test.tsx` | 11 |

---

**Próximo passo:** HU04 (perfis de acesso diferenciados) — depende de
definir a matriz de perfis e permissões antes de implementar.
