# HU09 — Análise Inteligente de Desempenho

**Status:** Implementada e validada — fonte de respostas integrada em 13/10/2026.
**Dependências:** HU07, HU08 e questões corrigidas pelo sistema.

## Critérios de aceite

1. O sistema deve calcular o desempenho do candidato por disciplina ou conteúdo.
2. O sistema deve identificar disciplinas ou conteúdos com desempenho abaixo dos demais.
3. A plataforma deve apresentar recomendações de estudo com base nos resultados identificados.
4. As recomendações devem utilizar os dados registrados pelo próprio candidato.

## Comportamento

`/analise` e GET `/api/analise`, protegidos. Dados derivados exclusivamente da
sessão, do edital do plano atual e das respostas corrigidas no servidor.
Não recebe percentuais ou totais manuais do navegador.

- Percentual por disciplina = acertos / questões respondidas × 100.
- Geral ponderado pela quantidade de respostas.
- Compara cada disciplina com a taxa agregada das outras que têm respostas.
- Taxa estritamente inferior identifica dificuldade e recomenda revisão/prática.
- Empates não geram recomendações. Sem respostas, não inventa resultados.
- Comparação exige respostas em pelo menos duas disciplinas; com uma, exibe seu
  percentual mas informa dados insuficientes para comparar.
- Comparação ocorre antes do arredondamento; percentuais exibidos com duas casas.
- Recomendações determinísticas, sem provedor de IA pago.

## Fonte confiável

DashboardService agrega resposta_questao por tópico e disciplina para o aluno.
Primeira resposta por questão é preservada, gabarito oculto até responder e
correção computada pelo servidor. Conclusão de tópico não é acerto. Antigos
campos manuais não influenciam a análise. Sem cruzar dados de outros alunos.

## Verificação

AnalisadorDesempenhoTest (6), AnaliseTest (2), QuestaoTest (8), TelaAnalise (4)
e E2E analise (2), além das outras suítes. Totais: 122 backend, 126 frontend,
19 E2E; build/lint limpos. Responsividade e axe verificados.

Teste real no Supabase V8: conta temporária respondeu uma questão de Português
errada e uma de Matemática correta. Geral 50%, comparação disponível e
recomendação somente em Português (0% contra 100%). Resposta restaurada e
reenvio recusado. Conta e seus dados de teste removidos; usuário real preservado.
Evidência: output/validacao/questoes-integracao-real.json.

O conjunto inicial tem quatro questões originais revisadas/publicadas, duas
em Português e duas em Matemática. Não são questões oficiais de prova. O ADMIN
pode cadastrar/revisar/publicar mais questões. Geração automática de questões
por IA não foi implementada.
