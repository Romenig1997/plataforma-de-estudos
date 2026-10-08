# Estratégia de Testes

> Complementa a seção 4 do
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).

## Princípio

Cada HU é validada pelos **critérios de aceite** que ela define, antes de
avançar para a próxima. Teste não é uma etapa final do projeto — é parte
do critério de desenvolvimento.

## Níveis

| Nível | Ferramenta | Quando usar |
|---|---|---|
| Teste de contexto | JUnit 5 + `@SpringBootTest` | Garantir que a aplicação sobe |
| Teste de unidade | JUnit 5 | Regras de negócio isoladas (HU07+) |
| Teste de integração | JUnit 5 + `MockMvc` / Testcontainers | Endpoints e persistência |
| Teste de componente | Testing Library | Comportamento de telas (HU01+) |
| Teste de ponta a ponta | A definir | Fluxos completos, após a HU06 |
| Lint / typecheck | ESLint, `tsc --noEmit` | Rede de segurança estática |

## Configuração atual

```powershell
cd backend  && .\mvnw.cmd test    # JUnit 5 + MockMvc + H2
cd frontend && npm test           # Vitest + Testing Library
cd frontend && npm run test:watch
cd frontend && npm run build      # typecheck do TypeScript
cd frontend && npm run lint       # ESLint
```

### Backend

JUnit 5 com `@SpringBootTest` + `@AutoConfigureMockMvc`, contra H2 em memória
(`src/test/resources/application.yml`). Nenhum teste toca a rede, nem o
Supabase.

| Suíte | Testes | HU |
|---|---|---|
| `PlataformaApplicationTests` | 1 | Etapa 0 — sobe o contexto |
| `CadastroUsuarioTest` | 10 | HU01 |
| `AutenticacaoTest` | 16 | HU02 |
| `PerfilTest` | 12 | HU03 |

`AutenticacaoTest` emite um token de verdade e o reapresenta, em vez de
simular a autenticação: só assim o filtro, a assinatura e a expiração são
verificados de ponta a ponta. `PerfilTest` segue o mesmo método — cada
teste cadastra pela API pública da HU01, faz login e só então usa o
recurso, sem autenticação simulada.

### Frontend

Vitest com `jsdom`, `@testing-library/react` e `@testing-library/user-event`.
Configuração em `vite.config.ts`; setup global em `src/preparacaoTestes.ts`
(jest-dom, limpeza automática entre testes, `sessionStorage` zerado a cada
teste).

| Arquivo | Testes | Cobre |
|---|---|---|
| `src/sessao.test.ts` | 5 | token no `sessionStorage`, `Authorization` no cabeçalho |
| `src/TelaLogin.test.tsx` | 10 | validação, erro de credencial, erro de rede, estado de carregamento |
| `src/App.test.tsx` | 9 | navegação, login bem-sucedido, logout, sessão expirada |
| `src/perfil.test.ts` | 7 | contrato HTTP do perfil (GET/PUT, 401, 400, rede) |
| `src/TelaPerfil.test.tsx` | 11 | carga, edição, validação local, erro por campo, 401, voltar |

Os testes simulam `fetch` com `vi.fn()` e `vi.stubGlobal`. Não há servidor de
teste nem biblioteca de mock de API: para contrato HTTP o backend já tem
MockMvc, e um mock mais sofisticado aqui só custaria legibilidade.

O acesso por `getByRole`/`getByLabelText` — e não por `data-testid` — é
deliberado: obriga o componente a ter os papéis e rótulos que a HU02 exige,
então o teste falha se a acessibilidade regredir.

## Nenhuma estratégia de teste foi inventada

Definir aqui ferramentas de ponta a ponta, metas de cobertura ou nomes de
suítes seria criar regra que o escopo não estabelece. A estratégia será
detalhada na primeira HU que precisar dela — a HU06, quando houver interface
definida para o teste ponta a ponta recair.

## Regras

- Um teste automatizado por critério de aceite relevante da HU
- Testes de regra de negócio não dependem de rede nem de banco real
- Falha de teste bloqueia o avanço da etapa
- Nenhum teste pode depender de dado de produção

## Pendência

Ferramenta de teste ponta a ponta **não definida** — será decidida quando
a HU06 definir a interface sobre a qual ela recairá. Registrado aqui para
não ser esquecido.