# Estado do Trabalho

> Registro de onde o projeto está e do que falta. Complementa
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md) e os documentos das HUs.
>
> **Atualizado em:** 01/10/2026 — HU02 commitada em `323c2d7`, árvore limpa.

## Onde estamos

| HU | Conteúdo | Estado |
|---|---|---|
| [HU01](hu/01-cadastro-de-usuarios.md) | Cadastro de usuários | **Concluída** (commit `485259a`) |
| [HU02](hu/02-autenticacao.md) | Autenticação com Spring Security + JWT | **Concluída** (commit `323c2d7`) |
| HU03 a HU09 | Perfis, banco, UI, planner, dashboard | Não iniciadas |

A árvore de trabalho está limpa: nada pendente de commit.

## Verificação

Tudo passa no momento em que este arquivo foi escrito:

```powershell
cd backend  && .\mvnw.cmd test    # 27 testes, 0 falhas
cd frontend && npm test           # 26 testes, 0 falhas
cd frontend && npm run build      # typecheck + build OK
cd frontend && npm run lint       # 0 problemas
```

| Suíte | Testes | HU |
|---|---|---|
| `PlataformaApplicationTests` | 1 | Etapa 0 |
| `CadastroUsuarioTest` | 10 | HU01 |
| `AutenticacaoTest` | 16 | HU02 |
| `sessao.test.ts` | 5 | HU02 |
| `TelaLogin.test.tsx` | 10 | HU02 |
| `App.test.tsx` | 9 | HU02 |

## Git

| Commit | Conteúdo |
|---|---|
| `98efde4` | Estrutura inicial (Etapa 0) |
| `485259a` | HU01 cadastro de usuários |
| `323c2d7` | HU02 autenticação |

O `backend/.env` está no `.gitignore` e nunca foi versionado. O segredo real do
JWT existe só ali; o único valor de chave no repositório é o de teste, em
`src/test/resources/application.yml`, que não protege nada.

## Decisões tomadas na HU02

O documento da HU tem a tabela completa com justificativa. O resumo é:

| Decisão | Escolha |
|---|---|
| Recurso protegido | `GET /api/auth/me` + tela mínima autenticada |
| Onde o token fica | `sessionStorage` |
| Logout | Sem endpoint; o navegador descarta o token |
| Segredo | `JWT_SECRET` obrigatório, no mínimo 32 bytes, 60 min de validade |
| Mensagem de recusa | Genérica, idêntica para e-mail inexistente e senha errada |
| Tela inicial | Login, com link para o cadastro |
| Testes de frontend | Vitest + Testing Library |
| CSS da HU01 | Classes generalizadas e compartilhadas |

## Limitações conhecidas

Registradas de propósito, não são bug:

- **Token no `sessionStorage` continua legível por JavaScript.** Não protege
  contra XSS. Cookie httpOnly seria mais seguro, mas exige mudança no backend e
  tratamento de CSRF.
- **Logout não revoga o token.** Quem capturar o token pode reapresentá-lo até
  expirar (confirmado via `curl`). Revogação real exigiria tabela de revogação,
  que é esquema da HU05.
- **`GET /api/health` foi removido.** Era técnico da Etapa 0; o próprio README
  mandava remover. A verificação continua pelo teste de contexto.
- **Docker não validado.** Os `Dockerfile` e o `docker-compose.yml` existem mas
  nunca foram construídos nem executados — não havia Docker na máquina.

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

O Vite faz proxy de `/api` para `localhost:8080`, então não há CORS no dev.
O `backend/.env` já está preenchido, incluindo o `JWT_SECRET` gerado.

### Sem depender do Supabase

```powershell
cd backend
.\mvnw.cmd -Ph2runtime spring-boot:run
```

Sobe a aplicação real contra H2 em memória. O banco morre com o processo, então
é preciso cadastrar a conta a cada boot — serve para validar o contrato HTTP,
não para uso contínuo.

### Para parar

```powershell
# Ctrl+C nos dois terminais
```

## Próximo passo

HU03 (gerenciamento de perfis) — é a próxima da sequência e o que desbloqueia a
HU04.

**Atenção ao iniciar a HU03:** os perfis ADMIN/ALUNO não existem ainda. Hoje o
`SecurityFilterChain` só tem `anyRequest().authenticated()`, sem regra por
perfil. A HU04 é quem acrescenta as regras, e o `ErroDeAutenticacaoHandler`
já tem o handler de 403 pronto para quando elas chegarem.

## Ponto de partida anterior

Documentos lidos antes de implementar a HU02: escopo do projeto, arquitetura,
banco de dados, UX/UI, estratégia de testes e as HUs 01 e 02.