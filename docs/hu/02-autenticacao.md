# HU02 — Sistema de Autenticação

**Status:** Concluída
**Dependências:** HU01

## Objetivo

Permitir que um usuário cadastrado acesse a plataforma com segurança, e
encerrar essa sessão quando terminar.

## Critérios de aceite

| # | Critério | Verificação |
|---|----------|-------------|
| 1 | Credenciais válidas autenticam | `POST /api/auth/login` → `200` com `token`, `tipo`, `expiraEmMinutos`, `id`, `nome`, `email` |
| 2 | E-mail inválido (formato) é recusado | `400`, erro no campo `email` |
| 3 | E-mail e senha obrigatórios | `400`, um erro por campo |
| 4 | E-mail inexistente é recusado | `401`, `campo: credenciais` |
| 5 | Senha incorreta é recusada | `401`, `campo: credenciais` |
| 6 | Recusa não revela se o e-mail existe | E-mail inexistente e senha errada devolvem **byte a byte a mesma** resposta |
| 7 | O token emitido é válido e traz o `id` do usuário | `TokenJwtService` revalida; `iss`, `iat` e `exp` conferidos; conteúdo sem nome nem e-mail |
| 8 | Recurso protegido aceita o token | `GET /api/auth/me` com `Authorization: Bearer` → `200` |
| 9 | Recurso protegido recusa ausência de token | `GET /api/auth/me` sem token → `401` |
| 10 | Token inválido, expirado ou de outra assinatura é recusado | `401` nos três casos |
| 11 | Logout encerra a sessão | Token sai do `sessionStorage`; a área autenticada deixa de renderizar e uma nova montagem começa no login |
| 12 | A senha nunca aparece na resposta | Nem em claro nem o hash, no login e no cadastro |
| 13 | Cadastro da HU01 continua público | `POST /api/usuarios` → `201` sem token |

Semântica do erro, no mesmo formato JSON da HU01
(`{"erros":[{"campo","mensagem"}]}`) para `400`, `401` e `409`.

## Decisões tomadas com o responsável

Nenhuma delas estava definida na documentação. Todas foram confirmadas antes
de implementar.

| Decisão | Escolha | Por quê |
|---|---|---|
| "Área autenticada" | `GET /api/auth/me` + tela mínima de boas-vindas com botão de sair | A HU08 (dashboard) e a HU07 (planner) estão fora do escopo e o router é HU06. Sem um recurso protegido não há como provar, nem por teste, que o token protege algo |
| Onde o token fica | `sessionStorage` | Não sobrevive ao fechamento do navegador. **Não** é prova contra XSS: um token no `sessionStorage` continua legível por JavaScript. Cookie httpOnly seria mais seguro, mas exige mudança no backend e tratamento de CSRF |
| Logout | Sem endpoint: o navegador descarta o token | A API é sem estado; o servidor não guarda lista de tokens e não tem como revogar um token já entregue. Revogação real exigiria tabela de revogação — esquema novo, adiado para a HU05 |
| Segredo e validade | `JWT_SECRET` obrigatório no `.env`, sem valor padrão; 60 min | Segredo fora do código-fonte. Trocar o segredo invalida todos os tokens |
| Mensagem de recusa | Genérica e idêntica para e-mail inexistente e senha errada | Respostas diferentes permitiriam descobrir quais e-mails têm conta na plataforma |
| Tela inicial | Login, com link para o cadastro | Sem router, a navegação é por estado. O cadastro da HU01 continua alcançável |
| Testes de frontend | Vitest + Testing Library | Os critérios de logout e de acesso após logout são comportamento de navegador; sem runner não haveria como automatizá-los |
| CSS da HU01 | Classes generalizadas e compartilhadas | O `App.css` da HU01 definia `.cadastro-container`/`.campo`/`.btn-enviar`, mas o `App.tsx` usava `.container`/`.card`/`.btn-primary`: o formulário renderizava sem estilo |

## Backend

### Dependências que entraram

| Dependência | Motivo |
|---|---|
| `spring-boot-starter-security` | Adiada na Etapa 0 exatamente para a HU02 (o `SecurityFilterChain` padrão bloqueia tudo) |
| `jjwt-api` / `jjwt-impl` / `jjwt-jackson` 0.12.6 | Emissão e validação do JWT. A versão é declarada no `pom.xml` porque o Spring Boot não gerencia esta biblioteca |

`BCrypt` continua fora. A conferência de senha usa o PBKDF2-HMAC-SHA256 que a
HU01 já gravou no banco — trocar o algoritmo invalidaria toda senha existente.

### Configuração

```yaml
plataforma:
  jwt:
    chave: ${JWT_SECRET}          # obrigatório, sem valor padrão
    emissor: plataforma-de-estudos
    expiracao-minutos: 60
```

`JWT_SECRET` precisa ter **ao menos 32 bytes** (HS256 usa chave de 256 bits). A
aplicação não sobe sem ele, e não sobe com ele curto. Gere com
`openssl rand -base64 48`. O segredo real fica no `backend/.env`, que está no
`.gitignore`. Os testes usam um valor próprio, só de teste, em
`src/test/resources/application.yml`.

### Endpoints

| Método | Rota | Acesso | Resposta |
|---|---|---|---|
| `POST` | `/api/auth/login` | público | `200` com o token, ou `400`/`401` |
| `GET` | `/api/auth/me` | exige token | `200` com `id`, `nome`, `email`, ou `401` |

Não existe rota de logout — ver a decisão acima.

`POST /api/usuarios` (HU01) continua público.

### Como o JWT é usado

O token leva apenas o `sub` (id do usuário), mais `iss`, `iat` e `exp`.
Nome e e-mail ficam de fora do token: a área autenticada os lê do banco em
`/api/auth/me`. Isso mantém o JWT pequeno e evita trafegar dado pessoal em um
cabeçalho que o navegador expõe.

```
POST /api/auth/login  {"email":"ana@email.com","senha":"senha1234"}

200 {"token":"eyJhbGciOiJIUzI1NiJ9...","tipo":"Bearer","expiraEmMinutos":60,
     "id":1,"nome":"Ana Souza","email":"ana@email.com"}

GET /api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...

200 {"id":1,"nome":"Ana Souza","email":"ana@email.com"}
```

Erro de credencial — o mesmo nos dois casos, de propósito:

```json
{ "erros": [ { "campo": "credenciais", "mensagem": "E-mail ou senha invalidos." } ] }
```

Recurso protegido sem token:

```json
{ "erros": [ { "campo": "autenticacao", "mensagem": "Faca login para acessar este recurso." } ] }
```

### Cadeia de segurança

`SecurityFilterChain` com `SessionCreationPolicy.STATELESS`: não há
`HttpSession`. O `FiltroDeTokenJwt` roda antes do
`UsernamePasswordAuthenticationFilter`, lê o cabeçalho `Authorization` e publica
a identidade no `SecurityContext`. Token ausente, malformado ou expirado **não**
bloqueia a requisição — o filtro segue sem autenticação, e quem decide é o
`authorizeHttpRequests`. É isso que mantém login e cadastro funcionando mesmo
com um token velho no navegador.

| Regra | Valor |
|---|---|
| `POST /api/usuarios` | público |
| `POST /api/auth/login` | público |
| `/error` | público (o despacho de erro do Spring precisa passar) |
| qualquer outra coisa | exige token |

`anyRequest().authenticated()` faz endpoint novo nascer protegido. Não há regra
por perfil: ADMIN/ALUNO é a HU04.

**CSRF desligado**, e é a decisão correta aqui: CSRF existe para impedir que um
site terceiro faça o navegador reenviar a credencial que está num cookie. Não
há cookie de sessão — a credencial viaja num cabeçalho que a própria página
precisa pedir. Sem cookie, não há o que reaproveitar.

**401 e 403 em JSON.** O `ErroDeAutenticacaoHandler` escreve no mesmo formato
de erro da HU01. Sem ele o Spring responderia com HTML ou corpo vazio, e o
frontend receberia algo que não sabe ler. O handler de 403 existe para quando a
HU04 trouxer as regras por perfil; hoje ele não dispara, porque a única regra em
vigor é "exige autenticação".

### Conferência de senha: ponte com o Spring Security

O `DaoAuthenticationProvider` precisa de um `PasswordEncoder`. O
`CodificadorDeSenhaSpring` implementa a interface delegando para o
`CodificadorDeSenha` da HU01 — é uma ponte, não um algoritmo novo.
`spring-security-crypto` já vem no starter; nenhuma dependência extra foi
declarada.

O `AuthenticationManager` é declarado explicitamente em
`ConfiguracaoDeSeguranca`. Sem um provedor no contexto, o Spring Boot criaria um
usuário padrão em memória e imprimiria a senha no log de startup.

## Frontend

`frontend/src/sessao.ts` concentra a sessão: guardar, ler e descartar o token, e
as duas chamadas autenticadas (`entrar`, `buscarSessaoAtual`).

| Arquivo | Papel |
|---|---|
| `App.tsx` | Casca. Escolhe entre login, cadastro e área autenticada. Sem router — a navegação é por estado, como manda a arquitetura |
| `TelaLogin.tsx` | Formulário de login |
| `TelaCadastro.tsx` | Formulário da HU01, extraído sem mudança de comportamento |
| `TelaAutenticada.tsx` | Área mínima autenticada: lê `/api/auth/me` e tem o botão de sair |
| `sessao.ts` | Token no `sessionStorage` e chamadas autenticadas |

Validação de campos no login antes de chamar a API: e-mail obrigatório e com
formato, senha obrigatória. Erros por campo, `aria-invalid`, `aria-describedby`,
`role="alert"`, `aria-live`, campos e botão desabilitados durante o envio com o
texto "Entrando...", e mensagem própria para erro de rede, distinta do erro de
credencial.

## Testes

`AutenticacaoTest` (backend, JUnit + MockMvc + H2) — 16 testes.
`TelaLogin.test.tsx`, `App.test.tsx`, `sessao.test.ts` (frontend, Vitest +
Testing Library) — 26 testes.

| # | Critério | Teste |
|---|---|---|
| 1 | Login com credenciais válidas | `AutenticacaoTest.autenticaCredenciaisValidas`, `TelaLogin > entra com credenciais validas` |
| 2 | Login com e-mail inexistente | `AutenticacaoTest.rejeitaEmailInexistente`, `TelaLogin > recusa e-mail inexistente` |
| 3 | Login com senha incorreta | `AutenticacaoTest.rejeitaSenhaIncorreta`, `TelaLogin > recusa senha incorreta` |
| 4 | Validação dos campos obrigatórios | `AutenticacaoTest.validaCamposObrigatorios`, `validaFormatoDoEmail`, `TelaLogin > nao chama a API e mostra o erro quando os campos estao vazios` |
| 5 | Geração de autenticação válida | `AutenticacaoTest.geraTokenComIdentificacaoEValidade`, `tokenNaoCarregaDadosPessoais`, `sessao > entrar envia e-mail e senha` |
| 6 | Acesso a recurso protegido com token | `AutenticacaoTest.acessaRecursoProtegidoComTokenValido`, `sessao > buscarSessaoAtual manda o token no cabecalho` |
| 7 | Tentativa de acesso sem autenticação | `AutenticacaoTest.bloqueiaAcessoSemToken`, `bloqueiaTokenInvalido`, `bloqueiaTokenExpirado`, `bloqueiaTokenDeOutraAssinatura` |
| 8 | Logout | `App > o botao de sair descarta o token e volta para a tela de login` |
| 9 | Não usar a área autenticada após logout | `App > depois do logout a area autenticada nao abre mais`, `depois do logout uma nova montagem comeca na tela de login` |

Extras: resposta de login sem senha nem hash (`naoExpoeSenhaNemHashNaResposta`),
recusa indistinguível (`naoRevelaQualDosDoisFalhou`), cadastro da HU01 ainda
público (`cadastroContinuaPublico`), e-mail em maiúsculas
(`autenticaEmailNormalizado`).

## Teste manual

```powershell
# Terminal 1 — backend
cd backend
.\mvnw.cmd spring-boot:run
# http://localhost:8080

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# http://localhost:5173
```

1. Abra `http://localhost:5173`. A tela de login aparece.
2. Clique em **Cadastre-se**, crie uma conta, volte ao login com o link
   **Entrar**.
3. Entre com e-mail e senha válidos. A área autenticada mostra seu nome e
   e-mail.
4. Recarregue a página (F5): a sessão continua, porque o token está no
   `sessionStorage`.
5. Clique em **Sair**. Volta para o login e o `sessionStorage` fica sem token.
   Recarregue: continua no login.
6. Entre com e-mail inexistente e com senha errada: a mesma mensagem aparece nos
   dois casos.
7. Envie o formulário vazio: os erros aparecem nos campos e nada é enviado ao
   servidor (olhe a aba *Network* do navegador).
8. No DevTools, em *Application → Session Storage*, veja `plataforma:token`
   aparecer depois do login e sumir depois do logout.

Sem Docker e sem credencial do Supabase, dá para validar o contrato com
`curl`:

```powershell
cd backend
.\mvnw.cmd -Ph2runtime spring-boot:run

# Em outro terminal
curl -X POST http://localhost:8080/api/usuarios -H "Content-Type: application/json" -d '{\"nome\":\"Ana Souza\",\"email\":\"ana@email.com\",\"senha\":\"senha1234\"}'
curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"ana@email.com\",\"senha\":\"senha1234\"}'
curl http://localhost:8080/api/auth/me -H "Authorization: Bearer <token>"
```

## Fora deste documento

Perfis ADMIN/ALUNO (HU04), gerenciamento de perfis (HU03), recuperação de
senha, dashboard (HU08), planner (HU07) e router de telas (HU06).

---

**Próximo passo:** HU03.