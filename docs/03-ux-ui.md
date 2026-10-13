# UX/UI

> Complementa a seção 6 do
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).

## Princípio

A interface é parte do desenvolvimento desde o início — não é algo a ser
adicionado no final. O **padrão visual detalhado** (design system, tokens,
componentes, router) foi decidido e implementado na **HU06 (Interface de
Usuário)**. Até lá, a Etapa 0 entregou apenas a casca mínima necessária
para a aplicação React montar.

## Requisitos do escopo

O escopo estabelece que o sistema deve manter um padrão visual
consistente entre as telas, considerando:

- responsividade;
- boa hierarquia visual;
- acessibilidade;
- contraste adequado;
- feedback visual nos formulários;
- estados de carregamento, sucesso, erro e vazio quando necessários;
- navegação clara e consistente.

Estes sete pontos são o checklist de qualquer tela entregue a partir da
HU01.

## Decisões (definidas na HU06)

| Item | Decisão tomada | Onde |
|---|---|---|
| Biblioteca de CSS ou de componentes | **Nenhuma** — CSS puro com tokens em `:root` | `src/index.css` |
| Tokens de cor, espaçamento e tipografia | Escalas `--espaco-1..8`, `--texto-xs..xl`, cores de superfície/texto/destaque/feedback | `src/index.css` |
| Router e navegação entre telas | `react-router-dom` 7.18.4, com `RotaProtegida` | `src/App.tsx`, `src/main.tsx` |
| Componente de formulário com feedback | `CampoFormulario` (label↔`id`, `aria-invalid`, `aria-describedby`) | `src/componentes/` |

## Baseline já aplicada

- `lang="pt-BR"` no documento
- `viewport` com `width=device-width, initial-scale=1.0` (responsividade)
- ponto de montagem `#root` sem dependência de framework
- Reset mínimo de CSS (`box-sizing`, remoção de margem padrão)
- Cores com contraste adequado já no placeholder — mantido pelos tokens da HU06
- `StrictMode` do React habilitado, para detectar problemas de renderização

## Checklist de acessibilidade (HU06, implementado)

- **Semantic HTML** antes de `div` para fins de layout (`main`, `header`,
  `form`, `label`, `dl`/`dt`/`dd`, `table` com `thead`/`th`/`tbody`)
- **Hierarquia de headings** sem pular níveis
- **Rótulos (`label`)** associados aos campos por `for`/`id`
- **Feedback de erro não apenas visual**: mensagem legível + `aria-invalid`
  + `aria-describedby` (e borda vermelha como reforço visual)
- **Foco visível** e não apenas por cor (`:focus-visible` + anel de foco)
- **Navegação por teclado** funcional (botões/foco nativos)
- **Contraste** gateado por auditoria **axe** no teste ponta a ponta
  (regra `color-contrast`, WCAG AA) — `frontend/e2e/interface.spec.ts`

## Responsividade (critério 1)

- Layout em coluna única abaixo de `40rem`, em linha acima — sem rolagem
  horizontal em celular nem em PC (verificado no Playwright em 320/375 e
  1280 px).
- Tipografia com tamanhos responsivos via `clamp()`.

## Feedback visual nos formulários (critério 3)

O contrato acessível é definido no componente `CampoFormulario`:

- erro → borda vermelha (`--color-erro`), texto legível do erro e
  `aria-invalid=true`;
- ajuda → `aria-describedby` apontando para o texto de apoio;
- a cor é consequência do `aria-invalid` no CSS, então o teste de componente
  verifica o atributo e o E2E verifica a cor calculada no navegador.