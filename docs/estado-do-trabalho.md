# Estado do Trabalho

> Registro de onde o projeto está e do que falta. Complementa
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md) e os documentos das HUs.
>
> **Atualizado em:** 13/10/2026 — HU05 (estrutura de banco) concluída;
> verificação local rodada (backend 53 testes, frontend 54 testes, build e
> lint limpos). **Alterações da HU05 ainda não commitadas.**

## Onde estamos

| HU | Conteúdo | Estado |
|---|---|---|
| [HU01](hu/01-cadastro-de-usuarios.md) | Cadastro de usuários | **Concluída** (commit `485259a`) |
| [HU02](hu/02-autenticacao.md) | Autenticação com Spring Security + JWT | **Concluída** (commit `323c2d7`) |
| [HU03](hu/03-gerenciamento-de-perfis.md) | Gerenciamento de perfis | **Concluída** (commit `58e0bc0`) |
| [HU04](hu/04-perfis-de-acesso-diferenciados.md) | Perfis de acesso (ADMIN/ALUNO) | **Concluída** (commit `82345f9`) |
| [HU05](hu/05-estrutura-de-banco-de-dados.md) | Estruturação de banco de dados | **Concluída** (pendente commit) |
| HU06 a HU09 | UI, planner, dashboard, análise | Não iniciadas |

A árvore de trabalho **não está limpa**: as mudanças da HU05 aguardam commit.

## Verificação

Tudo passa no momento em que este arquivo foi escrito:

```powershell
cd backend  && .\mvnw.cmd test    # 53 testes, 0 falhas
cd frontend && npm test           # 54 testes, 0 falhas
cd frontend && npm run build      # typecheck + build OK
cd frontend && npm run lint       # 0 problemas
```

| Suíte | Testes | HU |
|---|---|---|
| `PlataformaApplicationTests` | 1 | Etapa 0 |
| `CadastroUsuarioTest` | 10 | HU01 |
| `AutenticacaoTest` | 16 | HU02 |
| `PerfilTest` | 12 | HU03 |
| `PerfilDeAcessoTest` | 8 | HU04 |
| `EstruturaDeBancoTest` | 6 | HU05 |
| `sessao.test.ts` | 7 | HU02 |
| `TelaLogin.test.tsx` | 10 | HU02 |
| `App.test.tsx` | 11 | HU02/HU04 |
| `perfil.test.ts` | 7 | HU03 |
| `TelaPerfil.test.tsx` | 13 | HU03 |
| `TelaAdmin.test.tsx` | 6 | HU04 |

### Verificação manual da HU04 (Supabase + backend real)

Histórico, feita contra o banco remoto com a aplicação no ar: cadastro cria
`ALUNO`; `GET /api/auth/me` e `GET /api/perfil` respondem; `GET
/api/admin/usuarios` como ALUNO → 403 `campo: autorizacao`; promoção manual
no banco só reflete após re-login; como ADMIN → 200 sem `senhaHash`. A conta
`romenig.14@gmail.com` (id=3) foi promovida a ADMIN para teste no navegador.

## Git

| Commit | Conteúdo |
|---|---|
| `98efde4` | Estrutura inicial (Etapa 0) |
| `485259a` | HU01 cadastro de usuários |
| `323c2d7` | HU02 autenticação |
| `58e0bc0` | HU03 gerenciamento de perfis |
| `c4e582c` | docs: HU03 (critérios, banco, testes) |
| `24669e9` | fix: 403 no `PUT /api/perfil` (CORS) + mensagem por campo |
| `69fd67c` | docs: registra o bugfix do 403 |
| `82345f9` | HU04 perfis de acesso diferenciados |
| `544eefc` | docs: HU04 (matriz de perfis, testes) e atualização do estado |
| `d1cf0cf` | docs: estado do trabalho com o commit da HU04 e validação pendente |
| *(pendente)* | HU05 estrutura de banco de dados |

O `backend/.env` está no `.gitignore` e nunca foi versionado. O segredo real do
JWT existe só ali; o único valor de chave no repositório é o de teste, em
`src/test/resources/application.yml`, que não protege nada.

## Correções

| Quando | Bug | Causa | Correção |
|---|---|---|---|
| pós-HU03 | `PUT /api/perfil` devolvia **403** no navegador | CORS em duas camadas: o Spring Security aceitava o *preflight*, mas o Spring MVC (`ConfiguracaoWeb`) só aceitava `GET/POST/OPTIONS` | `24669e9` adicionou `PUT` a `ConfiguracaoWeb` e deixou o `TelaPerfil` apontar o campo com erro |

## Decisões tomadas na HU03

| Decisão | Escolha |
|---|---|
| Campos do perfil | Nome, e-mail (HU01) + meta de estudo semanal (1–168 h) + objetivo/motivação |
| Recurso | `GET/PUT /api/perfil`, separado de `/api/auth/me` |
| E-mail editável | Sim; normalizado; o e-mail próprio não conta como duplicado |
| Campos opcionais | `null` no banco, string vazia no formulário |
| Troca de senha | Fora do escopo |

## Decisões tomadas na HU04

| Decisão | Escolha |
|---|---|
| Perfis | Somente ADMIN e ALUNO nesta fase |
| Como virar ADMIN | Manual no banco; não há endpoint de promoção |
| Onde mora o perfil | No JWT (cópia) — o filtro autoriza sem consultar o banco |
| Promoção/degradação | Só reflete no próximo login |
| Token antigo sem claim | Tratado como ALUNO (least privilege) |
| Área admin | Mínima: `GET /api/admin/usuarios` + tela "Área admin" |

## Decisões tomadas na HU05

O documento da HU tem a tabela completa com justificativa. O resumo é:

| Decisão | Escolha |
|---|---|
| O que é a tabela `perfis` | O perfil de **acesso** (ADMIN/ALUNO), não os dados do perfil da HU03 |
| Relacionamento | 1:N (`usuario.perfil_id → perfil.id`) |
| Coluna `perfil` (texto) | Removida após backfill para `perfil_id` |
| `CHECK` adiado na HU04 | Desnecessário: `FK` + `UNIQUE` já impedem valor inválido |
| Senhas | Mantido PBKDF2-HMAC-SHA256 (trocar invalidaria hashes existentes) |
| Migração | Flyway (substituiu o `schema.sql`), com baseline do Supabase |
| Entidades de domínio (planner, edital, etc.) | Fora desta HU — dependem das HUs 07–09, sem conteúdo definido |

## Limitações conhecidas

Registradas de propósito, não são bug:

- **O perfil de acesso é uma cópia no JWT.** Promover ou rebaixar um usuário
  no banco muda o próximo login, mas quem já está logado mantém o perfil
  antigo até re-logar.

- **Token no `sessionStorage` continua legível por JavaScript.** Não protege
  contra XSS. Cookie httpOnly seria mais seguro, mas exige mudança no backend e
  tratamento de CSRF.

- **Logout não revoga o token.** Revogação real exigiria tabela de revogação,
  que segue não implementada (não pertence à HU05).

- **Baseline do Flyway no Supabase.** O banco remoto já tinha a estrutura da
  V1 (criada pelo `schema.sql` antigo); por isso a aplicação sobe com
  `baseline-on-migrate` + `baseline-version: 1`. Nesse banco a V1 não é
  executada — só a V2 em diante. Um banco vazio (H2 dos testes) roda V1 e V2.

- **Docker não validado.** Os `Dockerfile` e o `docker-compose.yml` existem mas
  nunca foram construídos nem executados — não há Docker na máquina.

- **`GET /api/health` foi removido.** Era técnico da Etapa 0.

## Como retomar

### Subir para testar no navegador

Dois terminais:

```powershell
# Terminal 1 — backend (usa o .env local, que aponta para o Supabase)
cd backend
.\mvnw.cmd spring-boot:run
# http://localhost:8080

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# http://localhost:5173
```

No primeiro boot contra o Supabase, o Flyway registra a V1 como baseline e
aplica a V2 (cria `perfil`, `usuario.perfil_id`, faz o backfill e remove a
coluna `perfil`). O Vite faz proxy de `/api` para `localhost:8080`, mas o
backend revalida o CORS em toda requisição — a lista de métodos em
`ConfiguracaoWeb` precisa cobrir o que a API usa (`GET`, `POST`, `PUT` +
`OPTIONS`).

### Sem depender do Supabase

```powershell
cd backend
.\mvnw.cmd -Ph2runtime spring-boot:run
```

Sobe a aplicação real contra H2 em memória (Flyway roda V1 e V2 do zero). O
banco morre com o processo, então é preciso cadastrar a conta a cada boot.

### Para parar

```powershell
# Ctrl+C nos dois terminais
```

## Próximo passo

**HU06 (Interface de Usuário)** — design system (tokens, biblioteca de CSS/
componentes), router e navegação, componentes base e estados. Depende de
definir o padrão visual e a biblioteca antes de implementar, conforme
[`03-ux-ui.md`](03-ux-ui.md) e o documento da própria HU.
