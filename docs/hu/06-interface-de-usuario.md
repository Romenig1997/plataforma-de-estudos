# HU06 — Interface de Usuário

**Status:** Concluída (commit `8703627`)
**Dependências:** HU01, HU05

## Objetivo

Definir e construir o padrão visual da plataforma.

## Critérios de aceite

Extraídos do documento acadêmico da HU06:

1. **Telas responsivas** — funcionam no celular e no PC.
2. **Cores e contrastes adequados** — legibilidade preservada, seguindo
   contraste WCAG AA.
3. **Formulários com feedback visual** — campos inválidos sinalizam o erro
   (ex.: borda vermelha) junto da mensagem.

## Como cada critério é validado

| Critério | Validação automatizada |
|---|---|
| 1. Responsividade | Teste ponta a ponta (Playwright) abre login e cadastro em viewports de celular (320/375 px) e PC (1280 px) e garante que não há rolagem horizontal — `e2e/interface.spec.ts` |
| 2. Cores e contrastes | Teste ponta a ponta roda a auditoria do **axe** (regras WCAG) na tela de login e exige zero violações de `color-contrast` e nenhuma violação *critical*/*serious* — `e2e/interface.spec.ts` |
| 3. Feedback dos formulários | Teste de componente (`CampoFormulario.test.tsx`) garante `aria-invalid` + `aria-describedby` no erro; teste ponta a ponta confere a **borda vermelha** calculada no navegador (`rgb(220, 38, 38)`) |

## O que foi entregue

### Design system em CSS puro (sem biblioteca de componentes)

Tokens no `:root` de `src/index.css` — cores de superfície/texto/destaque,
feedback de erro e sucesso, escala de espaçamento `--espaco-1..8`, tipografia
`--texto-xs..xl`, raio, sombra de cartão e anel de foco. `App.css` não usa
mais valor hardcoded: só `var(...)`.

Por que CSS puro e não Tailwind/MUI: a interface tem poucas telas e
formulários próprios; uma biblioteca de componentes adicionaria uma camada de
estilo e JS que o escopo não pede. O critério de contraste (2) é coberto
pelos tokens de cor + auditoria axe, não por tema de biblioteca.

### Componentes base

`src/componentes/` — `Botao` (variantes primária/secundária, estado
`carregando`), `CampoFormulario` (label↔controle por `id`, `aria-invalid` e
`aria-describedby` para erro/ajuda), `Cartao`, `Aviso`, `EstadoCarregando`,
`EstadoVazio`, `Tabela`. As cinco telas foram refatoradas para usá-los, sem
mudar lógica de validação/API.

### Rotas (react-router-dom 7.18.4)

`main.tsx` envolve a aplicação em `BrowserRouter`; `App.tsx` declara as
rotas `/login`, `/cadastro`, `/app`, `/perfil`, `/admin` e o coringa `*`
(→ `/login`). A rota autenticada usa `RotaProtegida`: sem token, redireciona
ao login. Substituiu a navegação por estado da HU02; os testes de `App`
foram adaptados com `MemoryRouter`.

### Responsividade e acessibilidade

- Layout em coluna única abaixo de `40rem`, em linha acima — sem rolagem
  horizontal nas telas públicas (critério 1, verificado por Playwright).
- Foco visível (`:focus-visible` + anel de foco), rótulos associados,
  `prefers-reduced-motion` respeitado.
- Acessibilidade auditada com **axe** no teste ponta a ponta (critério 2);
  `eslint-plugin-jsx-a11y` não entrou no lint porque ainda não suporta o
  ESLint 10 usado no projeto (peer depende de `^9`).

### Testes

| Suíte | O que garante |
|---|---|
| `Botao.test.tsx`, `CampoFormulario.test.tsx` | Componentes base: rótulos, `aria-invalid`, descrição de erro, estados |
| `e2e/interface.spec.ts` (Playwright + axe) | Critérios 1, 2 e 3 no navegador real |

Frontend: 60 testes de componente/unit + 4 E2E verdes; build e lint limpos.

## Bibliotecas adicionadas na HU06

| Pacote | Versão | Papel |
|---|---|---|
| `react-router-dom` | 7.18.4 | Rotas e `RotaProtegida` |
| `@playwright/test` | 1.64.0 (dev) | Teste ponta a ponta |
| `@axe-core/playwright` | 4.13.0 (dev) | Auditoria de acessibilidade/contraste |

## Decisões

| Item | Escolha |
|---|---|
| Biblioteca de CSS / componentes | **Nenhuma** — CSS puro com tokens |
| Router | `react-router-dom` (BrowserRouter + RotaProtegida) |
| Ferramenta de a11y em E2E | axe via Playwright |
| Feedback visual de erro | Borda vermelha (`--color-erro`) + mensagem + `aria-invalid` |

Detalhamento em [`../03-ux-ui.md`](../03-ux-ui.md).