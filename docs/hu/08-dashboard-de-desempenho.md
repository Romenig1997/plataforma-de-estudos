# HU08 — Dashboard de Desempenho

**Status:** Implementada e validada — integração de respostas concluída em 13/10/2026.
**Dependências:** HU07 (plano/cronograma), registros de conclusão e módulo de questões.

## Critérios de aceite

1. O dashboard deve apresentar o progresso geral dos estudos.
2. O sistema deve apresentar o desempenho do candidato por disciplina.
3. O sistema deve apresentar as próximas atividades de estudo planejadas.
4. As informações exibidas devem ser atualizadas de acordo com os registros realizados pelo candidato.

## Comportamento aprovado

- Progresso geral = tópicos finais concluídos / total do edital atual. O aluno
  marca/desmarca; grupos não duplicam os filhos.
- Desempenho = acertos / questões respondidas por disciplina, corrigidas no
  servidor. Aluno não preenche totais nem informa se acertou. Sem respostas:
  “Sem dados”; respostas erradas com zero acertos: 0%.
- Próximas cinco atividades futuras de tópicos pendentes, ordenadas por data/hora.
  Plano alterado sinaliza regeneração da agenda; agenda de outro edital não aparece.
- Painel consulta os dados ao abrir, ao atualizar e após salvar conclusão.
  Após responder questões, abrir o dashboard mostra a agregação atual do aluno.
- A conclusão do conteúdo é independente de responder questões.
- Primeira resposta por aluno/questão preservada; correção e explicação restauráveis.

## Implementação

`/dashboard`, `/questoes`, GET `/api/dashboard`, GET `/api/questoes` e
POST `/api/questoes/{id}/resposta`. `PUT /api/dashboard/registros/{conteudoId}`
aceita apenas conclusão. Totais antigos manuais de registro_estudo não alimentam
os indicadores; fonte confiável é resposta_questao do usuário autenticado.

V7 mantém conclusão por usuário/tópico. V8 cria questões, alternativas e
respostas. Ambas aplicadas no Supabase. Questões revisadas/publicadas por ADMIN,
sem gabarito antecipado na consulta do aluno. Sem IA paga.

## Verificação

DashboardTest (7), QuestaoTest (8), TelaDashboard (6), TelaQuestoes (4),
E2E dashboard (2) e questões (3), além das demais suítes. Projeto completo:
122 backend, 126 frontend, 19 E2E, build/lint limpos.

Validação real Supabase V8: conta temporária com o edital CBM PE respondeu
Português errado (0/1, 0%) e Matemática certo (1/1, 100%). Dashboard agregou
os resultados corretamente sem alterar a conclusão dos tópicos. Nova resposta
à mesma questão recusada com 409. Conta temporária e dados removidos; perfil,
plano, conclusão e respostas do usuário real preservados. Evidência sanitizada:
output/validacao/questoes-integracao-real.json.

## Histórico de correção

O preenchimento manual de questões/acertos foi retirado a pedido do responsável.
Questões ficaram em standby e foram retomadas com autorização. Falha da revisão
automática por limite de uso foi resolvida; não é um bloqueio atual.
