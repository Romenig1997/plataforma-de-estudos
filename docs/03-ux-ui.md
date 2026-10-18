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

## Decisões

A HU06 definiu o padrão visual com CSS puro e tokens em `:root`. Ele foi
substituído por um design system com **Tailwind CSS v4 + shadcn/ui**, mantendo
a mesma semântica acessível (rótulos, papéis e textos das telas).

| Item | Decisão | Onde |
|---|---|---|
| Biblioteca de estilos | **Tailwind CSS v4** (`@tailwindcss/vite`), sem CSS por tela | `vite.config.ts`, `src/index.css` |
| Componentes | **shadcn/ui** (estilo new-york, código no projeto) sobre Radix UI: Button, Card, Input, Textarea, NativeSelect, Label, Badge, Alert, Table, Tabs, Progress, Skeleton, Separator, Avatar, DropdownMenu, Popover, Tooltip | `src/components/ui/`, `components.json` |
| Tokens | Variáveis do shadcn (`--background`, `--primary`, `--muted`...) com as cores da marca ESTUDA, mais `success`, `warning`, `info` e `brand-*` | `src/index.css` |
| Tema escuro | Mesmos tokens redefinidos em `[data-tema='escuro']`; variante `dark:` ligada ao mesmo atributo | `src/index.css`, `EstruturaVisual.tsx` |
| Tipografia | Inter Variable servida pelo próprio site (`@fontsource-variable/inter`), compatível com a CSP | `src/index.css` |
| Ícones | `lucide-react` | telas e `src/componentes/` |
| Layout | Barra lateral recolhível no desktop, barra inferior com "Mais" no celular, cabeçalho fixo com busca, tema, notificações e conta | `src/EstruturaVisual.tsx` |
| Páginas | `Conteudo` (largura e ritmo), `CabecalhoDaPagina`, `Painel`, `Indicador`, `EstadoSemDados` | `src/componentes/Pagina.tsx` |
| Carregamento | **Skeleton** com o formato do conteúdo (`pagina`, `cartoes`, `lista`, `tabela`, `formulario`, `linha`), texto só para leitor de tela | `src/componentes/EstadoCarregando.tsx` |
| Formulários | `CampoFormulario` (label↔`id`, `aria-invalid`, `aria-describedby`) envolvendo Input/Textarea/NativeSelect | `src/componentes/` |
| Router | `react-router-dom` 7.18.4, com `RotaProtegida` | `src/App.tsx`, `src/main.tsx` |

### Regras para telas novas

- Use só tokens (`bg-card`, `text-muted-foreground`, `border-destructive`),
  nunca cor crua; assim o tema escuro funciona sem regra extra.
- Layout com flex/grid mobile-first: uma coluna no celular, colunas a partir
  de `sm`/`md`/`lg`. Nada pode causar rolagem horizontal em 320px (os testes
  e2e conferem).
- Todo carregamento usa `EstadoCarregando` com o `formato` mais parecido com
  o conteúdo final.
- Menus e popovers vêm do shadcn/ui com `modal={false}` (o modo modal injeta
  um `<style>` que a CSP `style-src 'self'` do nginx bloquearia). Para
  confirmações, use o fluxo de confirmação em linha já existente.
- Para adicionar um componente do shadcn/ui, copie-o para
  `src/components/ui/` seguindo o `components.json`.

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