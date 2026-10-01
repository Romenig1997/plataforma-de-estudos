# Plataforma Inteligente de Preparação para Concursos

Plataforma para auxiliar candidatos na organização e acompanhamento da
preparação para concursos, conforme as Histórias de Usuário do projeto
acadêmico.

O escopo que governa este repositório está em [`docs/00-escopo-do-projeto.md`](docs/00-escopo-do-projeto.md).

## Situação atual

**Etapa 0 — estrutura inicial do projeto.** O esqueleto do frontend e do
backend está pronto e verificado. Nenhuma funcionalidade de HU foi
implementada ainda, e isso é intencional: o escopo determina o
desenvolvimento de forma incremental.

| Item | Estado |
|---|---|
| Estrutura de pastas e configuração | Pronta |
| Frontend Vite + React + TypeScript | Compila e sobe |
| Backend Java 17 + Spring Boot | Testes passam e sobe |
| Dockerfiles e `docker-compose.yml` | Escritos, **não executados** (sem Docker na máquina) |
| Banco de dados | Não conectado — wiring previsto para a HU05 |
| HUs 1 a 9 | Não iniciadas |

### Endpoint temporário

Existe um endpoint técnico `GET /api/health`, que retorna
`{"status":"UP"}`. Ele **não pertence a nenhuma HU** e existe apenas para
validar que o esqueleto sobe na primeira execução. **Removê-lo após a
validação inicial.** Depois disso a verificação continua válida por dois
caminhos: o teste de contexto (`.\mvnw.cmd test`) e o log de startup do
Spring Boot.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + TypeScript 6 (Vite 8) |
| Backend | Java 17 + Spring Boot 4.1.1 |
| Banco de dados | PostgreSQL (Supabase Cloud) |
| Segurança | Spring Security + JWT *(a partir da HU02/HU04)* |
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
.\mvnw.cmd spring-boot:run
# http://localhost:8080/api/health

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# http://localhost:5173
```

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
.\mvnw.cmd test               # sobe o contexto do Spring
.\mvnw.cmd spring-boot:run

# Frontend
cd frontend
npm install
npm run build                 # typecheck do TypeScript + build
npm run lint
npm run dev
```

## Configuração

Variáveis de ambiente são documentadas em `backend/.env.example` e
`frontend/.env.example`. Arquivos `.env` reais estão no `.gitignore` e
**não devem ser commitados**.

Na Etapa 0 nenhuma variável é obrigatória — a aplicação sobe sem banco de
dados porque ainda não há entidades nem consultas.

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

Pastas como `entity/`, `repository/`, `service/`, `controller/` (backend) e
`pages/`, `components/`, `hooks/` (frontend) serão criadas quando cada HU
começar, e não antes. Pastas vazias não são versionadas pelo Git de todo
jeito.

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
| `docs/hu/*.md` | Um documento por História de Usuário |

## Regra de escopo

Funcionalidades, entidades, telas ou regras que não sejam necessárias para
as HUs não serão adicionadas. Quando uma informação não estiver definida no
escopo, ela será levantada antes da implementação em vez de ser inventada.