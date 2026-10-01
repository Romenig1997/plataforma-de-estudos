# Escopo do Projeto

> Especificação principal do projeto. Este arquivo é a fonte de verdade:
> nenhuma funcionalidade, entidade, tela ou regra deve ser implementada sem
> estar aqui definida.

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