# Escopo do Projeto

> Especificação principal do projeto. Este arquivo é a fonte de verdade:
> nenhuma funcionalidade, entidade, tela ou regra deve ser implementada sem
> estar aqui definida.

## Fonte dos critérios acadêmicos

Em 13/10/2026, o responsável forneceu `HU1-RomenigNunesFrançaMarinhoSouto.pdf`.
Os critérios transcritos nas HUs 03, 07, 08 e 09 foram alinhados a esse
documento. Decisões adicionais do projeto são identificadas separadamente.
A HU03 ainda precisa permitir foto; a HU07 exige disponibilidade em dias
e horários, atividades relacionadas ao edital e visualização por período.

### Cronograma aprovado para a HU07-C

Implementação autorizada após apresentação do plano: disponibilidade por
dia e intervalos no mesmo dia, semana iniciando na segunda-feira, sessões
de até 60 minutos, com tópicos reais do edital. O tempo por disciplina
vem da meta e prioridades do plano semanal. Sobreposições e disponibilidade
insuficiente são recusadas sem apagar o cronograma anterior. A agenda
atual é salva por usuário; alterar o plano sinaliza que ela deve ser gerada
novamente. Tudo funciona sem chamadas pagas de IA. A meta pode ser escolhida
e alterada pelo aluno no planner; foi autorizado gerar uma configuração de teste.

## 1. Identificação

**Projeto:** Plataforma Inteligente de Preparação para Concursos

**Objetivo:** desenvolver uma plataforma para auxiliar candidatos na
organização e acompanhamento de sua preparação para concursos, seguindo
as funcionalidades definidas nas Histórias de Usuário (HUs) do projeto
acadêmico.

## 2. Stack definida

### Frontend

-   React
-   TypeScript

### Backend

-   Java 17
-   Spring Boot

### Persistência

-   PostgreSQL
-   Supabase

### Outros

-   Spring Security
-   JWT
-   Docker
-   Git/GitHub

## 3. Histórias de Usuário

O desenvolvimento seguirá as 9 HUs definidas no documento acadêmico:

1.  Cadastro de Usuários
2.  Sistema de Autenticação
3.  Gerenciamento de Perfis
4.  Perfis de Acesso Diferenciados
5.  Estruturação de Banco de Dados
6.  Interface de Usuário (UI)
7.  Planner Inteligente de Estudos
8.  Dashboard de Desempenho
9.  Análise Inteligente de Desempenho

## 4. Critério de desenvolvimento

As funcionalidades serão implementadas de forma incremental.

Para cada HU:

1.  analisar o objetivo e os critérios de aceite;
2.  definir somente o necessário para sua implementação;
3.  implementar backend e/ou frontend conforme a necessidade;
4.  aplicar o padrão de UX/UI definido para o projeto;
5.  testar os critérios de aceite;
6.  validar a funcionalidade;
7.  somente depois avançar para a próxima etapa.

## 5. Regra de escopo

Não serão adicionadas funcionalidades, entidades, telas ou regras que
não sejam necessárias para as HUs ou para uma dependência técnica
previamente definida.

Quando existir uma informação não definida no documento acadêmico, ela
deverá ser identificada antes da implementação, em vez de ser inventada.

## 6. UX/UI

### Planejamento por meta semanal

Confirmado pelo responsável em 13/10/2026 para a HU07-B: organizar o
tempo pela meta semanal de horas, sem exigir uma grade de horários por dia.
Confirmado: distribuir o tempo pelas prioridades escolhidas pelo aluno e
usar apenas a meta semanal, sem considerar a data da prova. O planner deve funcionar sem chamadas
pagas de IA, conforme a preferência confirmada nesta retomada.

### Continuação da HU07 sem custo de IA

Autorizada pelo responsável em 13/10/2026: utilizar o conteúdo real do
HTML fornecido, estruturado localmente e revisado pelo ADMIN, para alimentar
o catálogo sem chamadas pagas. O modo `manual` salva o PDF e aguarda revisão;
uma importação com falha também aceita a estrutura revisada pelo mesmo
endpoint de revisão. A aprovação, validação e autorização ADMIN continuam
obrigatórias. Isso não substitui a validação futura da extração automática.

A interface será tratada como parte do desenvolvimento desde o início.

O sistema deverá manter um padrão visual consistente entre as telas,
considerando:

-   responsividade;
-   boa hierarquia visual;
-   acessibilidade;
-   contraste adequado;
-   feedback visual nos formulários;
-   estados de carregamento, sucesso, erro e vazio quando necessários;
-   navegação clara e consistente.

## 7. Ordem técnica

A ordem de implementação será definida pelas dependências técnicas, sem
alterar a identificação das HUs no documento acadêmico.

A implementação será iniciada pela preparação da base do projeto e do
banco de dados, seguida pelas funcionalidades de usuário, autenticação,
acesso, perfil e interface. Posteriormente serão implementados o
planner, o dashboard e a análise de desempenho.

## 8. Regra para a documentação

A documentação será dividida em arquivos pequenos e específicos.

Cada HU terá seu próprio documento Markdown. Documentos de arquitetura,
banco de dados, UX/UI e testes serão mantidos separadamente.

O objetivo é evitar documentos excessivamente grandes e facilitar a
implementação, revisão e manutenção do projeto.

---

## Decisões técnicas de infraestrutura

Decididas com o responsável durante a Etapa 0 (estrutura inicial). Não
alteram o escopo acima — apenas concretizam o que ele deixa em aberto.

| Item | Decisão |
|---|---|
| Banco | PostgreSQL no **Supabase Cloud** (sem container local de Postgres) |
| Build do backend | **Maven**, com Maven Wrapper versionado |
| Frontend | **Vite** + React + TypeScript |
| Versão do Spring Boot | **4.1.1** |
| Nome do pacote Java | `br.com.romenig.plataforma` |
| Docker | Artefatos versionados (`Dockerfile` + `docker-compose.yml`) para os 2 serviços; execução **opcional** |
| CORS | Adicionado apenas na primeira chamada real frontend → backend (HU01) |

### HU08 — decisão aprovada em 13/10/2026

Progresso geral é a proporção de tópicos finais concluídos no edital selecionado.
Conclusão reversível pelo aluno. Desempenho é acertos/questões por disciplina,
sem dados quando não há questões. Mostrar próximas atividades do cronograma e
atualizar a partir dos registros. HU08 implementada sem IA paga; HU09 fica para
próxima proposta. Totais acumulados por tópico podem ser corrigidos e substituídos.


Correção vigente da HU08 (13/10/2026): aluno informa apenas conclusão do
conteúdo. Totais manuais de questões/acertos não são editáveis nem utilizados
pelo dashboard. Desempenho depende de respostas corrigidas pelo sistema;
módulo de questões em standby por pedido do responsável. As colunas existentes
da V7 foram preservadas, sem nova migration. HU08 parcial nesse requisito.


### Atualização vigente — questões validadas em 13/10/2026

V8 aplicada no Supabase e backend iniciado/validado. Resultados de respostas
corrigidas integram HU08 e HU09; os totais manuais antigos não são utilizados.
Quatro questões originais foram revisadas/publicadas; teste real de conta
exclusiva validou erro/acerto, agregação, comparação e recomendação, e a conta
foi removida. 122 testes backend, 126 frontend, 19 E2E, build/lint limpos.
Limite da revisão automática deixou de ser bloqueio. Próxima pendência: HU03 foto.

## Conferência acadêmica final — 13/10/2026

Foto do perfil implementada e validada no Supabase V9. Todos os 30 critérios
das nove HUs do PDF fornecido estão atendidos; matriz em validacao-final-das-hus.md.
128 backend, 136 frontend, 21 E2E; build/lint limpos. Geração/extração contínua
por IA são extras separados e não condicionam o aceite acadêmico.
