# Estado do Trabalho

> Registro de onde o projeto está e do que falta. Complementa
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md) e os documentos das HUs.
>
> **Atualizado em:** 08/10/2026 — bugfix do 403 no `PUT /api/perfil` commitado em `24669e9`.

## Onde estamos

| HU | Conteúdo | Estado |
|---|---|---|
| [HU01](hu/01-cadastro-de-usuarios.md) | Cadastro de usuários | **Concluída** (commit `485259a`) |
| [HU02](hu/02-autenticacao.md) | Autenticação com Spring Security + JWT | **Concluída** (commit `323c2d7`) |
| [HU03](hu/03-gerenciamento-de-perfis.md) | Gerenciamento de perfis | **Concluída** (commit `58e0bc0`) |
| HU04 a HU09 | Perfis de acesso, banco, UI, planner, dashboard | Não iniciadas |

A árvore de trabalho está limpa: nada pendente de commit.

## Verificação

Tudo passa no momento em que este arquivo foi escrito:

```powershell
cd backend  && .\mvnw.cmd test    # 39 testes, 0 falhas
cd frontend && npm test           # 46 testes, 0 falhas
cd frontend && npm run build      # typecheck + build OK
cd frontend && npm run lint       # 0 problemas
```

| Suíte | Testes | HU |
|---|---|---|
| `PlataformaApplicationTests` | 1 | Etapa 0 |
| `CadastroUsuarioTest` | 10 | HU01 |
| `AutenticacaoTest` | 16 | HU02 |
| `PerfilTest` | 12 | HU03 |
| `sessao.test.ts` | 5 | HU02 |
| `TelaLogin.test.tsx` | 10 | HU02 |
| `App.test.tsx` | 9 | HU02 |
| `perfil.test.ts` | 7 | HU03 |
| `TelaPerfil.test.tsx` | 13 | HU03 |

## Git

| Commit | Conteúdo |
|---|---|
| `98efde4` | Estrutura inicial (Etapa 0) |
| `485259a` | HU01 cadastro de usuários |
| `323c2d7` | HU02 autenticação |
| `58e0bc0` | HU03 gerenciamento de perfis |
| `24669e9` | fix: 403 no `PUT /api/perfil` (CORS) + mensagem por campo |

O `backend/.env` está no `.gitignore` e nunca foi versionado. O segredo real do
JWT existe só ali; o único valor de chave no repositório é o de teste, em
`src/test/resources/application.yml`, que não protege nada.

## Correções

| Quando | Bug | Causa | Correção |
|---|---|---|---|
| pós-HU03 | `PUT /api/perfil` devolvia **403** no navegador (o front mostrava "Não foi possível salvar. Tente novamente.") e o backend não logava nenhum erro | CORS em duas camadas: o Spring Security responde o *preflight* com uma config genérica (aceita o PUT), mas o Spring MVC (`ConfiguracaoWeb`) revalida a requisição real e só aceitava `GET/POST/OPTIONS` — o `PUT` era rejeitado com 403 de corpo vazio | `24669e9` adicionou `PUT` a `ConfiguracaoWeb` e deixou o `TelaPerfil` direcionar o erro: "Não foi possível salvar. Verifique: \<campo>." quando a API (ou a validação local) aponta campo(s) |

## Decisões tomadas na HU03

O documento da HU tem a tabela completa com justificativa. O resumo é:

| Decisão | Escolha |
|---|---|
| Campos do perfil | Nome, e-mail (HU01) + **meta de estudo semanal** (1–168 h) + **objetivo/motivação** — confirmados com o responsável |
| Recurso | `GET/PUT /api/perfil`, separado de `/api/auth/me` |
| E-mail editável | Sim; normalizado como na HU01; o e-mail próprio não conta como duplicado |
| Campos opcionais | `null` no banco, string vazia no formulário |
| Troca de senha | Fora do escopo, decisão do responsável |
| Regra ADMIN/ALUNO | Não nesta HU — é a HU04 |
| Router | Não; troca de componente por estado, como as demais telas |

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
- **`ALTER TABLE` da HU03 já rodou no Supabase.** O `schema.sql` é idempotente e
  roda a cada boot (`sql.init.mode: always`): as duas colunas novas foram
  aplicadas no primeiro `spring-boot:run` e o startup com `ddl-auto: validate`
  aprovou o schema remoto.

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

O Vite faz proxy de `/api` para `localhost:8080` (o navegador não vê *preflight*),
mas repassa o header `Origin` — então o backend **revalida o CORS em toda
requisição**. A lista de métodos em `ConfiguracaoWeb` precisa cobrir o que a API
usa (hoje `GET`, `POST`, `PUT` + `OPTIONS`): qualquer endpoint cujo método não
esteja listado devolve 403. Foi exatamente o bug do `PUT /api/perfil`, registrado
em Correções.
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

HU04 (perfis de acesso diferenciados) — é a próxima da sequência.

**Atenção ao iniciar a HU04:** a lista de perfis e a matriz de permissões não
constam do escopo disponível — precisam ser definidas com o responsável antes
de implementar (regra de escopo, §5). O `SecurityFilterChain` ainda só tem
`anyRequest().authenticated()`; acrescentar as regras por perfil é o trabalho
dela, e o `ErroDeAutenticacaoHandler` já tem o handler de 403 pronto.

## Ponto de partida anterior

Documentos lidos antes de implementar a HU02: escopo do projeto, arquitetura,
banco de dados, UX/UI, estratégia de testes e as HUs 01 e 02.
