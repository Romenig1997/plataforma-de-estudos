# Estado do Trabalho

> Registro de onde o projeto está e do que falta. Complementa
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md) e os documentos das HUs.
>
> **Atualizado em:** 08/10/2026 — HU04 (perfis de acesso) concluída
> (`82345f9` feat, `544eefc` docs); verificação manual no Supabase registrada
> abaixo; aplicação reiniciada para validação no navegador.

## Onde estamos

| HU | Conteúdo | Estado |
|---|---|---|
| [HU01](hu/01-cadastro-de-usuarios.md) | Cadastro de usuários | **Concluída** (commit `485259a`) |
| [HU02](hu/02-autenticacao.md) | Autenticação com Spring Security + JWT | **Concluída** (commit `323c2d7`) |
| [HU03](hu/03-gerenciamento-de-perfis.md) | Gerenciamento de perfis | **Concluída** (commit `58e0bc0`) |
| [HU04](hu/04-perfis-de-acesso-diferenciados.md) | Perfis de acesso (ADMIN/ALUNO) | **Concluída** (commit `82345f9`) |
| HU05 a HU09 | Banco de dados, UI, planner, dashboard | Não iniciadas |

A árvore de trabalho está limpa: nada pendente de commit.

## Verificação

Tudo passa no momento em que este arquivo foi escrito:

```powershell
cd backend  && .\mvnw.cmd test    # 47 testes, 0 falhas
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
| `sessao.test.ts` | 7 | HU02 |
| `TelaLogin.test.tsx` | 10 | HU02 |
| `App.test.tsx` | 11 | HU02/HU04 |
| `perfil.test.ts` | 7 | HU03 |
| `TelaPerfil.test.tsx` | 13 | HU03 |
| `TelaAdmin.test.tsx` | 6 | HU04 |

### Verificação manual da HU04 (Supabase + backend real)

Feita contra o banco remoto com a aplicação no ar:

1. Cadastro de conta de teste via `POST /api/usuarios` → `perfil` do login
   `ALUNO`.
2. `GET /api/auth/me` → `perfil: ALUNO`; `GET /api/perfil` → 200.
3. `GET /api/admin/usuarios` como ALUNO → **403** `campo: autorizacao`,
   mensagem `Voce nao tem permissao para acessar este recurso.`.
4. `UPDATE usuario SET perfil='ADMIN'` na conta de teste (promoção manual no
   banco) → o token **antigo** ainda responde 403 (o JWT carrega uma cópia);
   após **re-login**, `perfil: ADMIN`.
5. `GET /api/admin/usuarios` como ADMIN → **200**, lista com
   `id/email/perfil` e **sem** `senhaHash`.
6. A conta da própria plataforma (`id=3`, `romenig.14@gmail.com`) foi
   promovida a ADMIN a pedido, para testar a "Área admin" no navegador — a
   conta de teste foi removida.

**Validação visual pendente (navegador):** após a promoção, o backend foi
reiniciado com o código novo e o ambiente está no ar novamente
(`http://localhost:5173`, proxy para `localhost:8080`). Para ver a "Área
admin", é preciso **logar, sair e logar de novo** (o perfil é uma cópia no
JWT; o token antigo ainda é tratado como ALUNO).

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

## Decisões tomadas na HU04

O documento da HU tem a tabela completa com justificativa. O resumo é:

| Decisão | Escolha |
|---|---|
| Perfis | Somente ADMIN e ALUNO nesta fase |
| Como virar ADMIN | Manual no banco (`UPDATE usuario SET perfil='ADMIN'`); não há endpoint de promoção |
| Onde mora o perfil | No JWT (cópia) — o filtro autoriza sem consultar o banco |
| Promoção/degradação | Só reflete no próximo login (o token antigo continua como era) |
| Token antigo sem claim | Tratado como ALUNO (least privilege, nenhum acesso admin) |
| Área admin | Mínima: `GET /api/admin/usuarios` + tela "Área admin" |
| Rotas do aluno | Liberadas para ambos os perfis |
| `CHECK` no perfil | Não agora — a HU05 (estrutura de banco) trata constraints |

## Limitações conhecidas

Registradas de propósito, não são bug:

- **O perfil de acesso é uma cópia no JWT.** Promover ou rebaixar um usuário
  no banco muda o próximo login, mas quem já está logado mantém o perfil
  antigo até re-logar. É comportamento documentado (ver decisões da HU04).

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

HU05 (estrutura de banco de dados) — a próxima da sequência. Trata da
organização do banco (tabelas de estudo, materiais, etc.) e é o momento de
escrever as constraints (ex.: `CHECK` no perfil, por ora sem restrição no
banco).

## Ponto de partida anterior

Documentos lidos antes de implementar a HU02: escopo do projeto, arquitetura,
banco de dados, UX/UI, estratégia de testes e as HUs 01 e 02.
