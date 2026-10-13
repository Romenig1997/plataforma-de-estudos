# Plataforma Inteligente de Preparação para Concursos

Plataforma para auxiliar candidatos na organização e acompanhamento da
preparação para concursos, conforme as Histórias de Usuário do projeto
acadêmico.

O escopo que governa este repositório está em [`docs/00-escopo-do-projeto.md`](docs/00-escopo-do-projeto.md).

## Situação atual

**HUs 1 a 5 concluídas.** O projeto segue o escopo de forma incremental: cada
HU é implementada e validada pelos seus critérios de aceite antes de a próxima
começar.

| HU | Conteúdo | Estado |
|---|---|---|
| [HU01](docs/hu/01-cadastro-de-usuarios.md) | Cadastro de usuários | **Concluída** |
| [HU02](docs/hu/02-autenticacao.md) | Autenticação (Spring Security + JWT) | **Concluída** |
| [HU03](docs/hu/03-gerenciamento-de-perfis.md) | Gerenciamento de perfis | **Concluída** |
| [HU04](docs/hu/04-perfis-de-acesso-diferenciados.md) | Perfis de acesso (ADMIN/ALUNO) | **Concluída** |
| [HU05](docs/hu/05-estrutura-de-banco-de-dados.md) | Estruturação de banco de dados | **Concluída** |
| HU06 a HU09 | UI, planner, dashboard, análise | Não iniciadas |

| Item | Estado |
|---|---|
| Frontend Vite + React + TypeScript | Compila, sobe, 54 testes passam |
| Backend Java 17 + Spring Boot | 53 testes passam e sobe |
| Segurança | Spring Security + JWT implementados (HU02); perfis ADMIN/ALUNO (HU04) |
| Banco de dados | Conectado ao Supabase, esquema versionado com **Flyway** (HU05) |
| Dockerfiles e `docker-compose.yml` | Escritos, **não executados** (sem Docker na máquina) |

O esquema é versionado por migrations em `backend/src/main/resources/db/migration`
(o antigo `schema.sql` idempotente foi removido na HU05).

O endpoint técnico `GET /api/health` da Etapa 0 **já foi removido**, conforme o
próprio README mandava. Ele não pertence a nenhuma HU, e a verificação continua
válida pelo teste de contexto e pelos testes de cada HU.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 6 (Vite 8) |
| Backend | Java 17 + Spring Boot 4.1.1 |
| Banco de dados | PostgreSQL (Supabase Cloud) |
| Segurança | Spring Security + JWT *(perfis ADMIN/ALUNO são da HU04)* |
| Infraestrutura | Docker, Git/GitHub |

## Pré-requisitos

Para rodar **sem Docker**:

- **Java 17** — verifique com `java -version`. Se a saída indicar outra
  versão, o caminho do JDK 17 precisa vir antes no `PATH`.
- **Node.js 20.19+ ou 22.12+** — verifique com `node -v`.

O Maven **não** precisa ser instalado: o Maven Wrapper (`mvnw`) baixa a
distribuição automaticamente na primeira execução (requer internet).

## Como executar

### Caminho 1 — nativo (recomendado, sem Docker)

Rode os dois servidores em terminais separados.

```powershell
# Terminal 1 — backend
cd backend
Copy-Item .env.example .env   # preencha DB_URL, DB_USERNAME, DB_PASSWORD e JWT_SECRET
.\mvnw.cmd spring-boot:run
# http://localhost:8080

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# http://localhost:5173
```

Abra `http://localhost:5173`: a tela de login aparece. Cadastre-se pelo link
**Cadastre-se** e entre com as credenciais criadas.

Sem Docker e sem credencial do Supabase, dá para validar o contrato HTTP com o
perfil `h2runtime`, que sobe a aplicação real contra H2 em memória:

```powershell
cd backend
.\mvnw.cmd -Ph2runtime spring-boot:run
```

O passo a passo de validação manual da HU02 está em
[`docs/hu/02-autenticacao.md`](docs/hu/02-autenticacao.md).

### Caminho 2 — com Docker

Requer Docker Desktop instalado e em execução.

```powershell
docker compose up --build
# frontend -> http://localhost:5173
# backend  -> http://localhost:8080
```

> **Honestidade sobre o que foi testado:** os `Dockerfile` e o
> `docker-compose.yml` foram escritos e as tags de imagem base foram
> verificadas no registry, mas **os containers não foram construídos nem
> executados**, porque não havia Docker na máquina de desenvolvimento.
> Os *build steps* ainda não foram validados. Use o Caminho 1 para
> validar o projeto até que isso seja feito.

## Comandos de verificação

```powershell
# Backend
cd backend
.\mvnw.cmd -version          # deve reportar Java version: 17
.\mvnw.cmd test               # 53 testes: contexto e critérios das HU01-HU05
.\mvnw.cmd spring-boot:run

# Frontend
cd frontend
npm install
npm test                      # 54 testes: Vitest + Testing Library
npm run build                 # typecheck do TypeScript + build
npm run lint
npm run dev
```

## Configuração

Variáveis de ambiente são documentadas em `backend/.env.example` e
`frontend/.env.example`. Arquivos `.env` reais estão no `.gitignore` e
**não devem ser commitados**.

| Variável | Obrigatória desde | Motivo |
|---|---|---|
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | HU01 | Há entidade a persistir; o `DataSource` é obrigatório |
| `JWT_SECRET` | HU02 | Assinar e validar o token. Mínimo de 32 bytes (HS256); sem valor padrão, então a aplicação não sobe sem ela |

Gere o segredo com `openssl rand -base64 48`. Trocá-lo invalida todos os tokens
já emitidos — é o comportamento esperado.

Os testes não dependem de `.env`: usam o `application.yml` de
`src/test/resources`, com segredo e banco próprios de teste.

## Estrutura

```
plataforma-de-estudos/
├── README.md
├── .editorconfig
├── .gitignore
├── docker-compose.yml
│
├── docs/                      # documentação (um arquivo por assunto)
│   ├── 00-escopo-do-projeto.md
│   ├── 01-arquitetura.md
│   ├── 02-banco-de-dados.md
│   ├── 03-ux-ui.md
│   ├── 04-estrategia-de-testes.md
│   ├── estado-do-trabalho.md  # onde o projeto está e como retomar
│   └── hu/                    # um documento por HU
│
├── backend/                   # API REST — Java 17 / Spring Boot
│   ├── pom.xml
│   ├── mvnw, mvnw.cmd, .mvn/  # Maven Wrapper
│   ├── Dockerfile
│   └── src/
│       ├── main/java/br/com/romenig/plataforma/
│       ├── main/resources/application.yml
│       └── test/java/br/com/romenig/plataforma/
│
└── frontend/                  # SPA — React + TypeScript (Vite)
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    ├── Dockerfile, nginx.conf
    └── src/
```

### Telas do frontend

Sem router até a HU06 — a navegação é por estado, em `App.tsx`:

| Arquivo | Tela |
|---|---|
| `TelaLogin.tsx` | Login (HU02) |
| `TelaCadastro.tsx` | Cadastro de usuário (HU01) |
| `TelaAutenticada.tsx` | Área autenticada mínima (HU02) |

Pastas como `pages/`, `components/` e `hooks/` (frontend) serão criadas quando
cada HU precisar delas, e não antes. Pastas vazias não são versionadas pelo Git
de todo jeito.

## Documentação

A documentação é dividida em arquivos pequenos e específicos, conforme a
seção 8 do escopo:

| Arquivo | Conteúdo |
|---|---|
| `docs/00-escopo-do-projeto.md` | Especificação principal do projeto |
| `docs/01-arquitetura.md` | Decisões técnicas e da stack |
| `docs/02-banco-de-dados.md` | Conexão com o Supabase; esquema na HU05 |
| `docs/03-ux-ui.md` | Padrão visual da interface |
| `docs/04-estrategia-de-testes.md` | Estratégia de testes |
| `docs/hu/01-cadastro-de-usuarios.md` | Cadastro de usuários (concluída) |
| `docs/hu/02-autenticacao.md` | Autenticação (concluída) |
| `docs/estado-do-trabalho.md` | Onde o projeto está, limitações conhecidas, como retomar |
| `docs/hu/*.md` | Um documento por História de Usuário |

## Regra de escopo

Funcionalidades, entidades, telas ou regras que não sejam necessárias para
as HUs não serão adicionadas. Quando uma informação não estiver definida no
escopo, ela será levantada antes da implementação em vez de ser inventada.