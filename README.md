# Plataforma Inteligente de Preparação para Concursos

Plataforma para auxiliar candidatos na organização e acompanhamento da
preparação para concursos, conforme as Histórias de Usuário do projeto
acadêmico.

O escopo que governa este repositório está em [`docs/00-escopo-do-projeto.md`](docs/00-escopo-do-projeto.md).

## Situação atual

**HU01 a HU09 implementadas e validadas conforme os critérios acadêmicos.** A importação de editais em PDF
(incremento A) está implementada e validada nos testes locais. A validação
manual com Supabase está concluída: edital CBM PE aprovado sem chamadas
pagas. A extração automática com IA real permanece pendente. O ponto de retomada está em
[`docs/estado-do-trabalho.md`](docs/estado-do-trabalho.md).

O projeto segue o escopo de forma incremental: cada
HU é implementada e validada pelos seus critérios de aceite antes de a próxima
começar.

| HU | Conteúdo | Estado |
|---|---|---|
| [HU01](docs/hu/01-cadastro-de-usuarios.md) | Cadastro de usuários | **Concluída** |
| [HU02](docs/hu/02-autenticacao.md) | Autenticação (Spring Security + JWT) | **Concluída** |
| [HU03](docs/hu/03-gerenciamento-de-perfis.md) | Gerenciamento de perfis | **Implementada e validada** |
| [HU04](docs/hu/04-perfis-de-acesso-diferenciados.md) | Perfis de acesso (ADMIN/ALUNO) | **Concluída** |
| [HU05](docs/hu/05-estrutura-de-banco-de-dados.md) | Estruturação de banco de dados | **Concluída** |
| [HU06](docs/hu/06-interface-de-usuario.md) | Interface de usuário | **Concluída** |
| [HU07](docs/hu/07-planner-inteligente.md) | Planner inteligente | **A, B e C implementados** |
| [HU08](docs/hu/08-dashboard-de-desempenho.md) | Dashboard e registros | **Implementada e validada** |
| HU09 | Análise de desempenho | **Implementada e validada** |

| Item | Estado |
|---|---|
| Frontend Vite + React + TypeScript | 136 testes + 21 E2E passam; build e lint limpos |
| Backend Java 17 + Spring Boot | 128 testes passam contra H2; questões/dashboard/análise validados no Supabase |
| Segurança | Spring Security + JWT implementados (HU02); perfis ADMIN/ALUNO (HU04) |
| Banco de dados | Conectado ao Supabase, esquema versionado com **Flyway** (HU05) |
| Dockerfiles e `docker-compose.yml` | Escritos, **não executados** (sem Docker na máquina) |
| Operação e segurança de contas | V10 aplicada: confirmação de e-mail, recuperação de senha, revogação de sessões, health check SMTP e CI |

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
# http://localhost:5173 (proxy /api -> http://localhost:8080)

# Opcional: usar a API publicada em vez do backend local
# (API_PROXY_TARGET em frontend/.env.remoto.local)
npm run dev:remoto
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
.\mvnw.cmd test               # 128 testes: contexto e critérios das HU01-HU08
.\mvnw.cmd spring-boot:run

# Frontend
cd frontend
npm install
npm test                      # 158 testes: Vitest + Testing Library
npm run test:e2e              # 23 testes: Playwright + axe (API sempre simulada)
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
| `IA_API_KEY` | HU07-A (extração real) | Chamar o provedor de IA; sem a chave, a aplicação sobe, mas a extração falha |

`PLATAFORMA_IA_TIPO=rest` é o padrão. `fake` permite testar o fluxo local
com dados determinísticos, sem validar a extração real. A inicialização
contra o Supabase aplica migrations pendentes, inclusive a V3 da HU07-A.

Para seguir sem chamadas pagas, use `PLATAFORMA_IA_TIPO=manual` (configuração
local atual): o ADMIN carrega a estrutura real de revisão e aprova após a
validação. V4 permite tópicos com texto completo, sem o limite de 255 caracteres.

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

A navegação usa `react-router-dom`, com rotas definidas em `App.tsx`:

| Arquivo | Tela |
|---|---|
| `TelaLogin.tsx` | Login (HU02) |
| `TelaCadastro.tsx` | Cadastro de usuário (HU01) |
| `TelaAutenticada.tsx` | Área autenticada mínima (HU02) |
| `TelaPerfil.tsx` | Edição do perfil (HU03) |
| `TelaAdmin.tsx` | Área administrativa (HU04) |
| `TelaImportarEdital.tsx` | Importação, revisão e aprovação de editais (HU07-A) |
| `TelaPlanner.tsx` | Meta semanal, prioridades e plano salvo com conteúdos (HU07-B) |

Rotas públicas: `/login`, `/cadastro`. Rotas com sessão: `/app`, `/perfil`,
`/admin`, `/admin/editais`, `/planner`. A API exige ADMIN nos recursos administrativos.
Os componentes base ficam em `src/componentes/`, com tokens em `src/index.css`.

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

O cronograma está em `/cronograma`: dias e horários editáveis, atividades por
semana com conteúdos do edital e persistência individual. Meta editável em
`/planner`. V6 aplicada no Supabase; demonstração de 10h validada sem IA paga.

O dashboard está em `/dashboard`: progresso pelos tópicos concluídos do edital,
desempenho por disciplina e próximas atividades. O aluno marca/desmarca a
conclusão dos tópicos; progresso e próximas atividades atualizam após salvar.
Desempenho calculado pelas respostas corrigidas pelo sistema.

Análise em `/analise`: cálculos e recomendações preparados/testados; mostra
“Dados insuficientes” enquanto o aluno não tiver respostas suficientes.

Atualização vigente: questões e correção estão disponíveis em `/questoes` e
`/admin/questoes`, V8 aplicada. Quatro questões originais revisadas/publicadas.
HU08 e HU09 validadas com respostas reais de uma conta temporária removida
após o teste. O usuário pode responder para alimentar seu próprio desempenho.

A foto do perfil está disponível em `/perfil`: PNG/JPEG, até 2 MB, prévia,
salvar, substituir e remover. Supabase V9. A conferência final dos 30 critérios
está em [docs/validacao-final-das-hus.md](docs/validacao-final-das-hus.md).

Para publicação e configuração de SMTP, backup, health check e CI, veja
[docs/05-operacao-e-publicacao.md](docs/05-operacao-e-publicacao.md).
