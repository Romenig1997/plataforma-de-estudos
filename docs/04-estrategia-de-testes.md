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

A Etapa 0 entrega apenas a infraestrutura:

```powershell
cd backend  && .\mvnw.cmd test    # JUnit 5, via spring-boot-starter-test
cd frontend && npm run build      # typecheck do TypeScript
cd frontend && npm run lint       # ESLint
```

O único teste existente é `PlataformaApplicationTests`, que sobe o
contexto do Spring Boot e prova que a aplicação inicializa.

## Nenhuma estratégia de teste foi inventada

Definir aqui ferramentas de ponta a ponta, metas de cobertura ou nomes de
suítes seria criar regra que o escopo não estabelece. A estratégia será
detalhada na primeira HU que precisar dela — a HU01, ao validar o
formulário de cadastro.

## Regras

- Um teste automatizado por critério de aceite relevante da HU
- Testes de regra de negócio não dependem de rede nem de banco real
- Falha de teste bloqueia o avanço da etapa
- Nenhum teste pode depender de dado de produção

## Pendência

Ferramenta de teste ponta a ponta **não definida** — será decidida quando
a HU06 definir a interface sobre a qual ela recairá. Registrado aqui para
não ser esquecido.