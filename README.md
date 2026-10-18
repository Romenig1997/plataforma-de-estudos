# Plataforma Estuda — Preparação para Concursos

Plataforma web para candidatos a concursos públicos. Ela organiza editais,
disciplinas e conteúdos; registra estudos e desempenho; identifica
dificuldades; recomenda prioridades; e monta um planejamento de estudos a
partir da disponibilidade do candidato.

O escopo acadêmico está em [`docs/00-escopo-do-projeto.md`](docs/00-escopo-do-projeto.md)
e o ponto de retomada em [`docs/estado-do-trabalho.md`](docs/estado-do-trabalho.md).

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 6 (Vite 8), CSS puro, `@supabase/supabase-js` só para autenticação |
| Backend | Java 17 + Spring Boot 4.1 (API REST), Spring Security, JPA/Hibernate, Flyway |
| Banco de dados | PostgreSQL do **Supabase**, com **RLS** |
| Autenticação | **Supabase Auth**: cadastro, login, sessão, confirmação de e-mail e redefinição de senha |
| Arquivos | **Supabase Storage**: fotos de perfil (bucket `avatars`) |

## Arquitetura de autenticação

```
Navegador (React)                     Supabase                    API Java (Spring Boot)
─────────────────                     ────────                    ──────────────────────
Cadastro/Login/Logout ──────────────► Auth (senhas, e-mails)
          │  access token (JWT)                │ gatilho: cria o perfil ALUNO
          ▼                                    ▼
fetch /api/... Authorization: Bearer ──────────────────────────► FiltroDeTokenSupabase
                                                                  confere assinatura, emissor,
                                                                  audiência e validade; lê o
                                                                  papel (ADMIN/ALUNO) no banco
```

- **Senhas existem apenas no Supabase Auth.** A aplicação não guarda senha nem
  hash (V18 remove a coluna antiga). O frontend chama o Supabase diretamente
  para cadastro, login, logout e recuperação de senha.
- O backend **não emite tokens**. Ele confere o access token do Supabase: pelo
  JWKS público, em projetos com chaves assimétricas, ou pelo segredo legado
  HS256. Também confere o emissor `{SUPABASE_URL}/auth/v1`, a audiência
  `authenticated` e a validade.
- O **papel** (ADMIN/ALUNO) fica na tabela `perfil` e é lido do banco a cada
  requisição. Uma promoção feita pela área admin vale imediatamente. Um claim
  forjado no token não concede acesso.
- A **sessão** fica no navegador sob a chave `plataforma:sessao` e é renovada
  automaticamente. O logout a revoga no Supabase e volta para o login.
- **RLS** em todas as tabelas do schema `public`: o aluno só lê e altera os
  próprios dados pela Data API; o anônimo não lê nada.

## Como executar

### Pré-requisitos

- **Java 17** (`java -version`). O Maven Wrapper baixa o Maven sozinho.
- **Node.js 20.19+ ou 22.12+** (`node -v`).
- Um **projeto Supabase de desenvolvimento**, configurado como na seção
  [Configuração manual no Supabase](#configuração-manual-no-supabase). Sem
  Docker não há Supabase local; use um projeto gratuito separado do de
  produção.

### Backend

```powershell
cd backend
Copy-Item .env.example .env   # preencha DB_*, SUPABASE_URL e SUPABASE_ANON_KEY
.\mvnw.cmd spring-boot:run    # http://localhost:8080
```

Ao subir contra o banco, o Flyway aplica as migrations pendentes de
`backend/src/main/resources/db/migration` (V17 e V18 nesta versão).

**Backend isolado, com H2 em memória** (`.\mvnw.cmd -Ph2runtime spring-boot:run`):
esse perfil usa a configuração dos testes, que só aceita tokens de um Supabase
fictício e guarda fotos em memória. Para entrar com contas reais do projeto
Supabase de desenvolvimento, defina antes, no mesmo terminal:

```powershell
$env:PLATAFORMA_SUPABASE_URL = "https://<ref-de-desenvolvimento>.supabase.co"
# Só se o projeto ainda assinar com o Legacy JWT secret (HS256):
# $env:PLATAFORMA_SUPABASE_JWTSECRET = "<legacy jwt secret>"
$env:PLATAFORMA_SUPABASE_CHAVEPUBLICA = "<chave anon/publishable>"
$env:PLATAFORMA_ARMAZENAMENTO_TIPO = "supabase"
```

O perfil `teste-local` (dados de demonstração, arquivo não versionado) cria
perfis sem vínculo; ao entrar com o mesmo e-mail no Supabase de
desenvolvimento, cada perfil é vinculado e mantém papel e progresso.

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm install
npm run dev                          # http://localhost:5173 (proxy /api -> localhost:8080)
```

`npm run dev:remoto` aponta o proxy para a API publicada (lê
`frontend/.env.remoto.local`). O `npm run dev` padrão nunca fala com a produção.

### Migrations do Supabase

O esquema da aplicação é versionado pelo **Flyway** (tabelas, colunas e a view
`profiles`), com as mesmas migrations rodando no H2 dos testes. O que só existe
no Supabase fica em [`supabase/migrations`](supabase/migrations): vínculo com
`auth.users`, gatilho de criação de perfil, RLS e Storage.

**Ordem obrigatória:**

1. Suba o backend uma vez contra o banco. O Flyway aplica a V17 (vínculo
   `auth_id`, `avatar_url`, view `profiles`) e a V18 (remove `senha_hash`,
   `sessao_versao` e `token_conta`).
2. Aplique os arquivos de `supabase/migrations` **em ordem**, por um destes
   caminhos:
   - **SQL Editor** do painel: cole e execute cada arquivo, do mais antigo ao
     mais novo;
   - **Supabase CLI**: `npx supabase link --project-ref <ref>` e depois
     `npx supabase db push`.
3. Execute [`supabase/verificacao/verificar_rls.sql`](supabase/verificacao/verificar_rls.sql)
   no SQL Editor. O script roda dentro de uma transação com `ROLLBACK` e
   confere que nenhuma tabela ficou sem RLS e que um aluno não enxerga os
   dados de outro.

Os arquivos de `supabase/migrations` são idempotentes e podem ser executados de
novo. **Toda migration Flyway nova que criar tabela deve ser seguida de RLS**:
o passo 3 aponta qualquer tabela esquecida.

## Configuração manual no Supabase

Faça primeiro no projeto de desenvolvimento e repita no de produção somente na
janela de publicação (ver [Publicação](#publicação-em-produção)).

1. **Chaves e URL** — *Project Settings → API / API Keys*
   - Copie a **Project URL** para `SUPABASE_URL` (backend) e `VITE_SUPABASE_URL`
     (frontend).
   - Copie a chave **anon** ou **publishable** para `SUPABASE_ANON_KEY` e
     `VITE_SUPABASE_ANON_KEY`. Ela é pública, mas **nunca** use a
     `service_role`/secret no frontend; a aplicação não precisa dela.
2. **Chaves de assinatura do JWT** — *Project Settings → JWT Keys*
   - Projeto com **chaves assimétricas** (ECC/RSA, padrão em projetos novos):
     deixe `SUPABASE_JWT_SECRET` vazio. O backend lê o JWKS público.
   - Projeto ainda no **Legacy JWT secret** (HS256): copie o segredo para
     `SUPABASE_JWT_SECRET` no backend. É um **segredo**: só em `backend/.env`
     e nas variáveis do servidor.
3. **Provedor de e-mail e senha** — *Authentication → Sign In / Providers → Email*
   - Habilitado, com **Confirm email** ligado. O vínculo seguro de contas
     antigas depende disso.
   - **Minimum password length: 8** (mesma regra validada no formulário).
4. **URLs de retorno** — *Authentication → URL Configuration*
   - **Site URL**: `http://localhost:5173` (desenvolvimento) ou o endereço
     publicado do frontend (produção).
   - **Redirect URLs**: `http://localhost:5173/**` e `https://<frontend-publicado>/**`.
     Os links de confirmação voltam para `/confirmar-email` e os de
     redefinição, para `/redefinir-senha`.
5. **SMTP próprio** — *Authentication → Emails → SMTP Settings*
   - O e-mail embutido do Supabase envia poucas mensagens por hora e só para
     membros do projeto. Configure o SMTP do provedor usado antes (ex.: Brevo:
     host `smtp-relay.brevo.com`, porta `587`, usuário e chave SMTP do
     Brevo, remetente verificado).
   - Opcional: traduza os modelos de *Confirm signup* e *Reset password* em
     *Authentication → Emails → Templates*.
6. **Migrations** — siga a [ordem acima](#migrations-do-supabase). O arquivo
   `20261018000300_storage_fotos_de_perfil.sql` cria o bucket `avatars`
   (público para leitura, 2 MB, PNG/JPEG) e as políticas que só deixam cada
   pessoa gravar na própria pasta.
7. **Administrador** — o papel inicial de toda conta é ALUNO. Para o primeiro
   ADMIN de um projeto novo, depois do cadastro, rode no SQL Editor:
   ```sql
   update public.usuario set perfil_id = (select id from public.perfil where nome = 'ADMIN')
    where email = '<email-do-administrador>';
   ```
   Os demais administradores são promovidos pela área admin.

### Contas criadas antes do Supabase Auth

As senhas antigas (PBKDF2) não podem ser importadas pelo Supabase Auth. Os
perfis, papéis e todo o progresso são **preservados**: a pessoa se cadastra de
novo com o **mesmo e-mail** e, assim que confirma o e-mail, o gatilho
`sincronizar_perfil_do_auth` (ou o backend, no primeiro acesso) liga a nova
identidade ao perfil antigo. Um ADMIN antigo continua ADMIN.

## Variáveis de ambiente

Documentadas em [`backend/.env.example`](backend/.env.example) e
[`frontend/.env.example`](frontend/.env.example). Arquivos `.env` reais estão
no `.gitignore` e não devem ser commitados.

| Variável | Onde | Obrigatória | Uso |
|---|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | backend | sim | Conexão JDBC com o PostgreSQL do Supabase |
| `SUPABASE_URL` | backend | sim | Emissor aceito nos tokens, JWKS e Storage |
| `SUPABASE_ANON_KEY` | backend | sim, para fotos | Cabeçalho `apikey` no envio da foto ao Storage |
| `SUPABASE_JWT_SECRET` | backend | só em projeto legado HS256 | Conferir tokens assinados com o segredo legado (**segredo**) |
| `SUPABASE_BUCKET_FOTOS` | backend | não (`avatars`) | Bucket das fotos de perfil |
| `CORS_ORIGINS` | backend | não | Origens que chamam a API diretamente |
| `PLATAFORMA_IA_TIPO`, `IA_*` | backend | não | Extração de editais (use `manual` para não chamar IA paga) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | frontend (build) | sim | Cliente do Supabase Auth; vão para o bundle, por isso só a chave pública |
| `API_PROXY_TARGET` | frontend (dev) | não | Destino do proxy `/api` no Vite |

Saíram nesta versão: `JWT_SECRET`, `FRONTEND_URL`, `EMAIL_*`, `SMTP_*`,
`BREVO_API_KEY` e `MAIL_HEALTH_ENABLED`. Os e-mails de conta passaram para o
Supabase Auth (item 5 da configuração).

## Modelo de dados

Tabelas da aplicação (nomes em português) e equivalência com a estrutura
mínima pedida no escopo:

| Escopo | Implementação | Isolamento (RLS) |
|---|---|---|
| `profiles` (`id`, `nome`, `avatar_url`, `role`, `created_at`, `updated_at`) | view `profiles` sobre `usuario` + `perfil`; `id` = `auth.users.id` | `security_invoker`: herda o RLS de `usuario` |
| Perfil do usuário | `usuario` (`auth_id` → `auth.users`, `perfil_id` → `perfil`) | dono lê e altera nome/foto/meta; papel e e-mail bloqueados |
| Papéis | `perfil` (ADMIN, ALUNO) | leitura para autenticados |
| `editais`, `disciplinas`, `conteudos` | `edital` → `disciplina` → `conteudo` (árvore por `pai_id`), `concurso`, `cargo` | leitura para autenticados; escrita só ADMIN |
| `disponibilidades_estudo` | `disponibilidade_estudo` (→ `cronograma_estudo`) | só o dono |
| `atividades_planejadas` | `atividade_estudo` (→ `cronograma_estudo`, `disciplina`, `conteudo`) | só o dono |
| Planejamento | `plano_estudo`, `plano_disciplina`, `cronograma_estudo`, `cronograma_plano` | só o dono |
| `registros_estudo` | `registro_estudo` | só o dono |
| `resultados_questoes` | `resposta_questao` (corrigida no servidor) + `questao`, `questao_alternativa` | dono só lê; gabarito nunca exposto |
| Recomendações | calculadas a partir de `registro_estudo` e `resposta_questao` (`AnalisadorDesempenho`) | — |
| Arquivos | `edital_pdf`, `edital_banner`, `importacao_edital`; fotos no Storage `avatars` | só ADMIN; fotos na pasta `{auth.uid()}` |

O backend conecta com o usuário dono das tabelas, que não é afetado pelo RLS.
Na API Java, o isolamento é feito pelas consultas filtradas pelo usuário da
sessão, cobertas pelos testes de integração. O RLS protege o acesso direto pela
Data API do Supabase, que fica exposta porque a chave pública vai para o
navegador.

## Testes e verificação

```powershell
# Backend (H2 em memória, sem rede nem credenciais)
cd backend
.\mvnw.cmd test               # 172 testes

# Frontend
cd frontend
npm test                      # 230 testes (Vitest + Testing Library; Supabase simulado)
npm run test:e2e              # 27 testes (Playwright + axe; Vite próprio na porta 5174, Supabase fictício)
npm run lint
npm run build
```

Os testes do backend emitem tokens no formato do Supabase (`ContasDeTeste`),
assinados com um segredo que só existe em `src/test/resources/application.yml`,
e cobrem token válido, expirado, de outra chave, de outro emissor, sem
assinatura, ES256 via JWKS, vínculo de contas antigas e papel lido do banco.

## Publicação em produção

Nada desta versão foi publicado. A troca de autenticação precisa acontecer de
uma vez, porque a V18 remove o login antigo:

1. Configure o Supabase de produção (itens 1 a 5 acima).
2. No Railway, ajuste as variáveis: backend (`SUPABASE_URL`, `SUPABASE_ANON_KEY`
   e, se for o caso, `SUPABASE_JWT_SECRET`); frontend (`VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`, lidas no **build** pelo `Dockerfile`).
3. Publique backend e frontend juntos. O backend aplica V17 e V18 ao subir.
4. Aplique `supabase/migrations` e rode `supabase/verificacao/verificar_rls.sql`.
5. Peça às contas existentes que se cadastrem de novo com o mesmo e-mail.

## Estrutura

```
plataforma-de-estudos/
├── backend/                   # API REST — Java 17 / Spring Boot
│   └── src/main/resources/db/migration/   # Flyway (V1 a V18)
├── frontend/                  # SPA — React + TypeScript (Vite)
│   └── src/
│       ├── supabase.ts        # cliente do Supabase (somente Auth)
│       ├── autenticacao.ts    # cadastro, login, logout, recuperação de senha
│       ├── contextoDaSessao.ts
│       └── componentes/       # design system reutilizável
├── supabase/
│   ├── migrations/            # vínculo com auth.users, gatilho, RLS e Storage
│   └── verificacao/           # script de conferência do RLS (com ROLLBACK)
└── docs/                      # escopo, arquitetura, HUs e estado do trabalho
```

### Rotas do frontend

| Rota | Acesso | Tela |
|---|---|---|
| `/`, `/login`, `/cadastro`, `/esqueci-senha`, `/redefinir-senha`, `/confirmar-email` | pública | Início, autenticação e recuperação de conta |
| `/app`, `/curso/:id`, `/planner`, `/cronograma`, `/dashboard`, `/questoes`, `/perfil`, `/seguranca` | sessão | Área do aluno |
| `/admin`, `/admin/alunos`, `/admin/cursos`, `/admin/editais`, `/admin/questoes` | sessão ADMIN | Área administrativa, com navegação própria; aluno vê **Acesso negado** |

## Documentação

| Arquivo | Conteúdo |
|---|---|
| `docs/00-escopo-do-projeto.md` | Especificação principal do projeto |
| `docs/01-arquitetura.md` | Decisões técnicas e da stack |
| `docs/02-banco-de-dados.md` | Banco e migrations |
| `docs/03-ux-ui.md` | Padrão visual da interface |
| `docs/04-estrategia-de-testes.md` | Estratégia de testes |
| `docs/05-operacao-e-publicacao.md` | Operação, backup e CI |
| `docs/hu/*.md` | Um documento por História de Usuário |
| `docs/estado-do-trabalho.md` | Onde o projeto está e como retomar |
