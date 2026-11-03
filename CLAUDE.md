# CLAUDE.md — Plataforma Estuda

Instruções para o Claude trabalhar neste repositório sem reler conversas
antigas. Leia tudo antes de agir. Atualize este arquivo quando algo aqui
deixar de ser verdade (seção "Estado atual" principalmente).

## 1. O projeto em uma frase

Plataforma de estudos para concursos (trabalho acadêmico do Romenig): o admin
importa o edital em PDF, ele vira um curso com aulas; o aluno monta o planner,
recebe um cronograma semanal, resolve questões e acompanha o desempenho.
Idioma de tudo (código, UI, commits, docs, respostas): **português do Brasil**.

## 2. Regras do usuário (obrigatórias, sempre)

**Fluxo de trabalho**
- Desenvolver e testar **localmente**. Deploy só quando um conjunto de
  mudanças estiver pronto **e o usuário autorizar** ("só faça o deploy depois
  da minha autorização"). Merge na `main` = deploy automático → também pede
  autorização.
- Não fazer push/merge/alteração no Supabase de produção sem pedido explícito.
- Explique em linguagem simples; o usuário não é especialista. Respostas
  objetivas, com passo a passo quando ele precisar agir.

**Segurança**
- Nunca expor credenciais em logs, respostas ou commits. Não colocar segredos
  no GitHub (use `sync: false`, variáveis do painel, `.env` ignorado).
- Nunca usar a chave `service_role` no frontend (nem no backend de produção).
- Antes de mexer em validação de JWT, verificar o tipo de assinatura do
  Supabase (hoje: **ES256 via JWKS**; `SUPABASE_JWT_SECRET` só para HS256 legado).
- Sem acesso a uma credencial → dizer o que falta. **Não inventar valores.**
- Não recriar a coluna `senha_hash` (removida na V18; senhas são do Supabase Auth).
- Não destruir dados, não apagar usuários/tabelas sem necessidade. Nada
  irreversível sem explicar o risco e pedir aprovação (ex.: apagar linha do
  `flyway_schema_history` foi recusado pelo usuário).
- Ferramenta/permissão indisponível → informar exatamente o que bloqueou.
  Nunca fingir que executou.

## 3. Stack e estrutura

| Parte | Tecnologia | Pasta |
|---|---|---|
| Backend | Spring Boot 4, Java 17, Maven (`./mvnw`), JPA `ddl-auto: validate`, JdbcTemplate, Flyway | `backend/` |
| Frontend | React 19, Vite, TypeScript, Tailwind v4, shadcn/ui, lucide-react | `frontend/` |
| Banco/Auth/Storage | Supabase (Postgres, Auth, Storage, RLS) | `supabase/` |

Pacotes do backend (`backend/src/main/java/br/com/romenig/plataforma/`):
`admin`, `analise`, `autenticacao` (filtro/validador de token Supabase),
`config` (segurança, CORS, upload, relógio), `conta` (exclusão de conta),
`dashboard`, `edital` (importação, extração do PDF, armazenamento), `perfil`
(nome e foto), `planner` (+ `cronograma`, `feriados`, `agenda`), `questao`,
`usuario`, `erro`.

Frontend (`frontend/src/`): telas `Tela*.tsx` com teste ao lado
(`*.test.tsx`); clientes da API em arquivos simples (`api.ts`, `admin.ts`,
`cronograma.ts`, `perfil.ts`, `editais.ts`…). O frontend chama `/api/...` por
**caminho relativo** (proxy do Vite em dev; nginx/Netlify em produção).
`api.ts` tem `requisitar`, `requisitarJson`, `mensagemDaFalha` e os erros
tipados (`ErroDeApi`, `ErroDeRede`, `SessaoEncerrada`).

Migrations:
- Flyway em `backend/src/main/resources/db/migration`: **V1–V20**. V12 e V14 são
  migrations Java. Próxima: **V21**. Nunca editar uma migration já aplicada
  (checksum); se preciso, torne a nova idempotente (`IF NOT EXISTS`).
- SQL do Supabase (RLS, gatilhos, Storage) em `supabase/migrations/` — em
  produção são aplicadas **manualmente** pelo usuário no SQL Editor.

Documentação: `docs/00`–`09` (escopo, arquitetura, banco, UX, testes,
operação, Railway, dev local, PDFs no Storage, Netlify+Render) e `docs/hu/`
(uma por HU). `docs/estado-do-trabalho.md` é histórico longo — não precisa ler.

## 4. Comandos

```bash
# Backend
cd backend && ./mvnw test                     # testes (H2 em memória)
./mvnw spring-boot:run -Dspring-boot.run.profiles=local   # contra Supabase local

# Frontend
cd frontend && npm ci
npm run lint && npm run build && npm test     # vitest
npm run test:e2e                              # Playwright + axe
npm run dev:local                             # Vite apontando p/ Supabase local

# Supabase local (Docker) — detalhes em docs/07-desenvolvimento-local.md
npx supabase@2.121.0 start
./scripts/aplicar-supabase-local.sh && ./scripts/seed-local.sh
```

Contas locais do seed: `admin@local.test` / `aluno@local.test`, senha
`Estuda@2026` (só existem no banco local). Mailpit: http://127.0.0.1:54324.

CI (`.github/workflows/validar.yml`): `./mvnw test`; `npm run lint && build &&
test && test:e2e`; `docker compose build`. Rode o equivalente antes de push.

## 5. Convenções e armadilhas já aprendidas

- **Testes do backend** usam H2; para limpar usuário em teste use JDBC
  (`DELETE FROM usuario`) + `EntityManager.flush()/clear()` — via JPA dá
  `TransientPropertyValueException`.
- **E2E**: Playwright com `reducedMotion: 'reduce'` (axe media contraste no meio
  da transição) e `expect.poll` para checagens de layout após resize.
  Não usar `opacity` para "esmaecer" (falha contraste); use `bg-muted`.
- **CORS**: o backend recusa (403) `Origin` fora de `CORS_ORIGINS`. O proxy do
  Vite remove o `Origin`; Netlify repassa → `CORS_ORIGINS` precisa do domínio.
- **Uploads de edital**: até 30 MB (nginx `client_max_body_size 32m`).
- **PDFs**: bucket privado `editais-pdf` com URL assinada (1 h); fotos no
  bucket público `avatars`. CSP permite `frame-src blob: *.supabase.co`.
- **Feriados**: BrasilAPI `GET /api/feriados/v1/{ano}`, cache em memória por
  ano; se falhar, cronograma segue e avisa (`feriadosIndisponiveis`).
- **Agenda .ics**: `GET /api/agenda/{token}.ics` é público (token secreto,
  regenerável); link montado com `window.location.origin`.
- **Exclusão de conta** (`ExclusaoDeContaService`): uma transação; contas ADMIN
  protegidas; aluno confirma com senha (novo login antes de excluir).
- Heredoc no bash estraga `"\\;"` — editar arquivos com o Edit tool/python.

### Ambiente da nuvem do Claude (container)
- O daemon Docker cai com frequência: `setsid nohup dockerd >log 2>&1 &`,
  esperar `docker info`, depois `docker start` nos containers do Supabase.
- Nunca `pkill -f <padrão>`: o padrão casa com o próprio shell (exit 144).
  Mate por PID (`pgrep -x java`).
- Proxy bloqueia a BrasilAPI (403) → teste com servidor stub.
- Docker Hub pode dar 429; rode o `.jar` direto se precisar.
- E2E aqui: o Playwright do projeto não acha o navegador; rode com um config
  temporário que importa `playwright.config.ts` e põe
  `launchOptions.executablePath: '/opt/pw-browsers/chromium'` (não commitar).
- Checksum do Flyway divergente localmente → `supabase db reset` (local).

## 6. Produção e deploy

- **Site em produção: https://plataformaestuda.netlify.app**
- **Produção atual (desde 03/11/2026, PR #15)**: frontend no **Netlify**
  (`netlify.toml`: build de `frontend/`, proxy `/api/*` →
  `https://plataforma-estudos-api.onrender.com`, cabeçalhos de segurança/CSP)
  e backend no **Render** free (`render.yaml`, serviço
  `plataforma-estudos-api`, Docker de `backend/`). Os dois fazem deploy
  automático a cada merge na `main`. Passo a passo em
  `docs/09-publicacao-netlify-render.md`.
- O **Railway foi desligado** (crédito acabou; o usuário decidiu apagar os
  serviços em 03/11/2026). `docs/06-publicacao-no-railway.md`,
  `frontend/Dockerfile` e `frontend/nginx.conf` ficam só como histórico/alternativa;
  o Netlify não os usa. Mudou cabeçalho/CSP? Altere no `netlify.toml` (e no
  nginx.conf, para manter iguais).
- Limites do free: backend ~390 MB medidos com `-Xmx384m -XX:+UseSerialGC`
  (limite 512 MB); Render dorme após 15 min e leva ~1 min para acordar;
  proxy do Netlify espera ~26 s → abrir `/actuator/health` do Render antes de
  apresentar. Upload de edital (até 30 MB) passa pelo proxy do Netlify.
- Backend dormindo → o proxy do Netlify devolve **502/503/504**. O frontend
  trata isso: `servidorAcordando.ts` (`aguardarServidor`) repete a chamada a
  cada 3 s por até 150 s e mostra `componentes/ServidorAcordando.tsx` ("O
  servidor gratuito está acordando…"), no login (`TelaLogin`) e ao restaurar a
  sessão (`App`). Outros erros (401, 500) seguem aparecendo na hora.
- O container do Claude **não alcança `*.onrender.com` nem
  `*.netlify.app`** (proxy 403). Para verificar produção, peça ao usuário o
  resultado ou um print (ex.: abrir `/actuator/health` do Render).
- Variáveis do backend: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SUPABASE_URL`,
  `SUPABASE_ANON_KEY`, `CORS_ORIGINS` (+ opcionais `SUPABASE_JWT_SECRET`,
  `PLATAFORMA_IA_TIPO`, `IA_API_KEY`, buckets). Frontend (build):
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Valores só nos painéis.
- Trocar de domínio exige: `CORS_ORIGINS` no backend + Supabase Auth
  (Site URL e Redirect URLs).
- Health check: `/actuator/health`. Sem login, `/api/editais` → 401.

## 7. Git

- Branch de trabalho: `claude/nifty-thompson-6fgupb` (push com
  `git push -u origin <branch>`). PR para `main` só quando o usuário pedir;
  merge só com autorização (merge = deploy no Netlify e no Render). Se o PR
  da branch já foi mergeado, recriar a branch a partir da `main`.
- PRs já mergeados: #11 (Supabase Auth), #12 (dev local, shadcn, PDFs no
  Storage), #13 (V19 idempotente), #14 (EPIC 2), #15 (Netlify + Render),
  #16 (CLAUDE.md).
- GitHub via ferramentas MCP `mcp__github__*` (sem `gh`). Repo:
  `Romenig1997/plataforma-de-estudos`.
- Commits em português, estilo `feat: ...`, `fix: ...`, `chore: ...`.

## 8. Estado atual (atualize ao final de cada sessão)

**Contexto acadêmico**: EPIC 1 = HU01–HU09 (entregue). EPIC 2 = HU15–HU18
(exclusão de conta pelo admin e pelo aluno, feriados no cronograma, cronograma
na agenda .ics) — implementada e em produção (PR #14). Apresentação/entrega
do vídeo: **16/11/2026**. Materiais de entrega ficaram fora do repo.

**Publicação**: no ar no Netlify + Render; Railway desligado.

**Pendências / a confirmar**
1. Se o upload de edital de 30 MB falhar pelo proxy do Netlify, alternativa:
   upload direto para o Render (CORS já permite o domínio do Netlify).
2. Usuário aplicar em produção (SQL Editor do Supabase), se ainda não fez:
   `supabase/migrations/20261018000400_storage_pdfs_de_editais.sql` e
   `supabase/migrations/20261027000500_rls_exclusao_e_agenda.sql`.
3. Testar a exclusão de conta em produção.
4. Supabase free pausa após 7 dias sem uso — lembrar o usuário.
