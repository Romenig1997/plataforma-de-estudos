# Questões e correção automática — integração HU08/HU09

## Autorização e estado

Em 13/10/2026 o responsável autorizou retomar questões geradas conforme
os tópicos do edital, revisão/publicação pelo ADMIN e correção das respostas
pelo sistema. Sem chamadas pagas de IA. Código validado, V8 aplicada no Supabase e fluxo real concluído. A falha da
revisão automática foi resolvida após o responsável informar limite restabelecido.
HU08/HU09 implementadas e validadas com respostas corrigidas.

## Fluxo

ADMIN seleciona edital e tópico final, cadastra quatro alternativas, gabarito
e explicação. Pode corrigir rascunhos ou importar uma lista JSON de até 50.
Cada questão só fica visível ao aluno após “Aprovar e publicar”. Publicadas
não podem ser alteradas, preservando o significado das respostas históricas.

Aluno consulta apenas questões publicadas do edital do próprio plano. Gabarito
não é exposto antecipadamente. Ao enviar um índice de alternativa (0 a 3), o
servidor confere o gabarito, salva correta/incorreta e retorna a explicação.
A primeira resposta é preservada e novas submissões retornam conflito, sem
contar novamente. O aluno pode consultar a correção depois de recarregar.

Dashboard soma respostas e acertos do usuário por conteúdo e disciplina;
antigos totais manuais continuam ignorados. Concluir um tópico permanece uma
ação independente. HU09 usa esses resultados próprios para percentuais,
comparações e recomendações. Só compara com respostas em duas disciplinas.

## Banco e API

V8__questoes_e_respostas.sql cria questao, questao_alternativa e resposta_questao.
FKs e unicidade usuário/questão; limites para índice e gabarito. Nenhum dado
é incluído pela migration. Esquema remoto V8, aplicada em 13/10/2026; Hibernate validou as tabelas.

ADMIN: GET/POST /api/admin/questoes, PUT /{id}, POST /lote e /{id}/publicar.
ALUNO: GET /api/questoes e POST /api/questoes/{id}/resposta.
Rotas: /admin/questoes e /questoes. Autorização ADMIN permanece no servidor.

## Material preparado

output/questoes/cbm-pe-rascunhos.json: quatro questões originais, duas de
Português e duas de Matemática, com explicações. Versão legível em
output/questoes/revisao-cbm-pe.md. IDs observados no catálogo real: edital 2,
conteúdos 25 e 64. Referências temáticas ao PDF: páginas 2 e 5. Não são questões
oficiais nem transcrições de prova. Importadas, revisadas e publicadas no navegador. IDs das questões: 1 a 4.

## Verificação

Frontend: 126 testes e 19 E2E passaram, build e lint limpos. E2E usa API
simulada: revisão/publicação, resposta/correção, restauração, proteção,
320/1280px e axe. Testes de servidor escritos: QuestaoTest (8), incluindo
integração de resposta errada/correta com dashboard/analise, isolamento,
primeira tentativa, acesso ADMIN, rascunhos, edição e índices.

Suíte completa backend: 122 testes, sem falhas. V8 aplicada e backend iniciado.
As quatro questões foram importadas/revisadas/publicadas pelo fluxo ADMIN no
navegador. Visão do aluno confirmou quatro questões sem gabarito antecipado.

## Validação real e ponto de retomada

Teste contra API real/Supabase V8 com conta temporária própria: Português
0/1 (0%), Matemática 1/1 (100%), geral 50%, recomendação em Português.
Primeira resposta preservada após tentativa de reenvio; correção restaurada.
Conta e todos os seus dados de teste removidos, questões publicadas preservadas.
Uma falha inicial no roteiro de teste veio da leitura de arrays em PowerShell,
foi corrigida; a API passou na repetição. Não houve mudança de regra de negócio.

Evidências: output/validacao/questoes-integracao-real.json e
output/validacao/questoes-publicadas.jpg. Usuário real não recebeu respostas
simuladas nem alterações em seu desempenho. Pode responder pela tela /questoes.

Próxima pendência acadêmica: foto do perfil da HU03. Geração automática com
IA de questões ou extração de edital não foi implementada/validada nesta etapa.
