# UX/UI

> Complementa a seção 6 do
> [`00-escopo-do-projeto.md`](00-escopo-do-projeto.md).

## Princípio

A interface é parte do desenvolvimento desde o início — não é algo a ser
adicionado no final. Mas o **padrão visual detalhado** (design system,
biblioteca de componentes, tokens) é decidido na **HU06 (Interface de
Usuário)**. Até lá, a Etapa 0 entrega apenas a casca mínima necessária
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

## Decisões adiadas

| Item | Quando decidir |
|---|---|
| Biblioteca de CSS ou de componentes | **HU06** |
| Tokens de cor, espaçamento e tipografia | **HU06** |
| Router e navegação entre telas | **HU01 / HU06** |
| Componente de formulário com feedback | **HU01** |

Nenhuma dessas bibliotecas foi instalada na Etapa 0. Escolher antes da HU06
seria inventar decisão de design que pertence a ela.

## Baseline já aplicada

O que a Etapa 0 já garante, e que não será preciso refazer:

- `lang="pt-BR"` no documento
- `viewport` com `width=device-width, initial-scale=1.0` (responsividade)
- ponto de montagem `#root` sem dependência de framework
- Reset mínimo de CSS (`box-sizing`, remoção de margem padrão)
- Cores com contraste adequado já no placeholder
- `StrictMode` do React habilitado, para detectar problemas de renderização

## Checklist de acessividade a aplicar

A ser detalhado na HU06. Pontos já considerados desde a Etapa 0:

- Semantic HTML antes de `div` para fins de layout
- Hierarquia de headings sem pular níveis
- Rótulos (`label`) associados aos campos de formulário
- Foco visível e não apenas por cor
- Navegação por teclado funcional