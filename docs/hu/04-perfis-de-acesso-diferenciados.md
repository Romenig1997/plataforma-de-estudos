# HU04 — Perfis de Acesso Diferenciados

**Status:** Concluída
**Dependências:** HU02, HU03

## Objetivo

Diferenciar o que cada perfil de acesso pode ver e fazer na plataforma. Aqui
o foco é: o banco identifica o perfil de cada usuário, o ADMIN acessa a área
restrita e o ALUNO recebe erro de acesso negado ao tentar a área admin.

## Critérios de aceite

Confirmados com o responsável antes da implementação — a regra de escopo
proíbe inventar o que o documento acadêmico não define.

1. O banco identifica o perfil de cada usuário (ADMIN ou ALUNO).
2. O ADMIN acessa as rotas restritas da área admin.
3. O ALUNO recebe erro de acesso negado (403) ao tentar a área admin.
4. Cadastro cria usuários como **ALUNO**; não há endpoint de promoção.
5. A promoção a ADMIN é **manual no banco** e só reflete no próximo login.

## Matriz de perfis

| Perfil | Rotinas do aluno (perfil, /me) | Área admin |
|---|---|---|
| ALUNO | Sim | Não — 403 |
| ADMIN | Sim | Sim |

O documento acadêmico não define outras permissões de admin além do acesso à
área restrita; por isso a área admin é **mínima**: listar os usuários
cadastrados (`GET /api/admin/usuarios`). Existem apenas os perfis ADMIN e
ALUNO nesta fase.

## Coluna `perfil`

| Campo | Coluna | Tipo | Default |
|---|---|---|---|
| Perfil | `perfil` (nova) | `VARCHAR(20) NOT NULL` | `'ALUNO'` |

O `ALTER TABLE` no `schema.sql` é idempotente (`ADD COLUMN IF NOT EXISTS`) e
roda a cada boot, tanto no Supabase quanto no H2 dos testes. Não há
`CHECK` restringindo os valores — a HU05 (estrutura de banco) é quem trata
constraints.

## Escopo técnico

### Backend

- `schema.sql` — coluna `perfil` com default `ALUNO`.
- `Usuario.java` — campo `perfil` (default `"ALUNO"`, not null, 20 chars) e
  `getPerfil()`. O cadastro não recebe perfil: todo cadastro cria ALUNO.
- `TokenJwtService` — o perfil entra no JWT como claim `perfil`;
  `gerar(Long idUsuario, String perfil)` e `extrairPerfil(...)`.
- `FiltroDeTokenJwt` — a autoridade do usuário vem do claim do token; token
  antigo sem o claim é tratado como ALUNO (least privilege).
- `ConfiguracaoDeSeguranca` — `GET /api/admin/**` exige autoridade `ADMIN`;
  o resto continua `authenticated()`.
- Pacote `admin/`:
  - `AdminController` — `GET /api/admin/usuarios`.
  - `AdminService` — lista os usuários ordenadamente.
  - `dto/UsuarioAdminResponse` — id, nome, email, perfil; **nunca** o hash.
- `LoginResponse` e `SessaoAtualResponse` — passam a expor `perfil`.

### Frontend

- `sessao.ts` — tipo `PerfilDeAcesso` (`'ADMIN' | 'ALUNO'`) e `Usuario.perfil`.
- `admin.ts` — `listarUsuarios(token)` com os mesmos erros tipados da API.
- `TelaAdmin.tsx` — tabela (Nome, E-mail, Perfil), estados de carregamento,
  erro (403 mostra a mensagem de permissão), vazio e retry; 401 encerra a
  sessão; botão "Voltar".
- `TelaAutenticada.tsx` — botão "Área admin" **somente** quando
  `usuario.perfil === 'ADMIN'`; troca de tela por estado (sem router, HU06).

## Decisões

| Decisão | Escolha |
|---|---|
| Perfis existentes | Somente ADMIN e ALUNO nesta fase |
| Como virar ADMIN | Operação manual no banco (`UPDATE usuario SET perfil='ADMIN'`); não há endpoint |
| Onde mora o perfil | No JWT (cópia na emissão) — o filtro autoriza sem consultar o banco |
| Promoção/degradação | Reflete apenas no **próximo login** (o token carrega a cópia anterior) |
| Token antigo sem claim `perfil` | Tratado como ALUNO (nenhum acesso admin) |
| Área admin | Mínima: listar usuários cadastrados — o documento não define mais nada |
| Rotas do aluno | `GET/PUT /api/perfil` e `GET /api/auth/me` liberadas para ambos os perfis |
| `CHECK` no perfil | Não agora — a HU05 (estrutura de banco) trata constraints |
| Router | Não; estado no componente, como as demais telas (HU06) |

## Testes

| Suíte | Testes |
|---|---|
| `PerfilDeAcessoTest` (MockMvc + H2, novos) | 8 |
| `AutenticacaoTest` (asserts de `perfil`) | 16 |
| `TelaAdmin.test.tsx` (novos) | 6 |
| `App.test.tsx` (botão da área admin, novos) | 11 |
| Verificação manual (Supabase + HTTP) | Registrada no estado do trabalho |

Os testes cobrem: cadastro grava ALUNO; promoção no banco vira ADMIN; ALUNO
recebe 403 com `campo: autorizacao`; token antigo sem claim vira ALUNO (403);
ADMIN lista os usuários sem expor o hash; perfil/`me` continuam abertos para
os dois perfis.

---

**Próximo passo:** HU05 (estrutura de banco de dados).