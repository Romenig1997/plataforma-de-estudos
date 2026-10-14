# Conferência final das Histórias de Usuário

**Data:** 13/10/2026. **Resultado:** HU01 a HU09 implementadas e validadas
conforme os 30 critérios de aceite do documento acadêmico fornecido.

Fonte: HU1-RomenigNunesFrançaMarinhoSouto.pdf, em
C:/Users/Romenig/Desktop/Faculdade/HU1-RomenigNunesFrançaMarinhoSouto.pdf.
O documento foi relido nesta conferência; seus critérios definem esta matriz.

| HU | Critérios conferidos | Evidências | Estado |
|---|---|---|---|
| 01 — Cadastro | Nome/e-mail/senha obrigatórios; senha de pelo menos 8 caracteres; e-mail único | CadastroUsuarioTest (10), validação da interface e constraints de usuário | Atendida |
| 02 — Autenticação | Validar credenciais; erro quando inválidas; logout encerra a sessão no navegador | AutenticacaoTest (16), sessao/TelaLogin/App; rotas protegidas | Atendida |
| 03 — Perfil | Exibir dados atuais; editar foto e nome; persistir alterações | PerfilTest (12), FotoPerfilTest (6), TelaPerfil/FotoPerfilEditor; teste real Supabase V9 com novo login | Atendida |
| 04 — Acesso | Banco diferencia ADMIN/ALUNO; rotas restritas para ADMIN; ALUNO recebe acesso negado | PerfilDeAcessoTest (8), autorização /api/admin/**, verificação de questões/admin | Atendida |
| 05 — Banco | Usuários/perfis criados; relacionamentos definidos; senhas protegidas criptograficamente | EstruturaDeBancoTest (6), Flyway V1–V9 no H2 e Supabase, hash PBKDF2 com salt (não texto puro) | Atendida |
| 06 — Interface | Responsiva em celular/PC; contraste adequado; feedback visual de formulário | E2E interface (4) e demais telas; 320/1280px, axe, borda/aria-invalid | Atendida |
| 07 — Planejamento | Disponibilidade por dia/horário; atividades compatíveis; disciplinas/conteúdos do edital; visão por período | GeradorCronogramaTest (5), CronogramaTest (5), planner/cronograma E2E; 10h e 17 atividades reais restauradas | Atendida |
| 08 — Dashboard | Progresso geral; desempenho por disciplina; próximas atividades; atualização pelos registros | DashboardTest (7), QuestaoTest (8), telas/E2E; teste real de respostas 0%/100% e conclusão independente | Atendida |
| 09 — Análise | Calcular desempenho; identificar inferiores; recomendar conforme resultados; usar dados próprios | AnalisadorDesempenhoTest (6), AnaliseTest (2), QuestaoTest (8); teste real geral 50% e recomendação em Português | Atendida |

## Verificação técnica final

- Backend: 128 testes, sem falhas, contra H2 com migrations reais.
- Frontend: 136 testes, sem falhas.
- Navegador: 21 testes E2E, sem falhas; fluxo simulado, responsividade e axe.
- Typecheck/build e lint aprovados; git diff --check sem erros de whitespace.
- Supabase: V9 aplicada; Hibernate validou o esquema.

## Validação real

- Edital CBM PE: 13 disciplinas e 127 tópicos; estrutura revisada e aprovada.
- Planner/cronograma: meta editável, prioridades, dias/horários e persistência.
- Questões: quatro originais revisadas/publicadas; gabarito oculto antes de responder.
- Conta temporária respondeu Português errado e Matemática correto: 0%, 100%,
  geral 50%, recomendação em Português. Reenvio recusado e primeira resposta preservada.
- Outra conta temporária enviou foto, fez novo login, alterou nome preservando a
  imagem e removeu a foto. PNG/JPEG validados no servidor, limite 2 MB, imagem
  normalizada até 512px. Não há URLs públicas para fotos.
- Contas temporárias e seus dados removidos. Dados reais do responsável preservados.

Evidências: output/validacao/questoes-integracao-real.json,
foto-perfil-integracao-real.json, questoes-publicadas.jpg, perfil-foto-hu03.jpg,
planner-semanal-salvo.jpg e cronograma-semanal-salvo.jpg.

## Limites do resultado

A conferência se refere aos critérios acadêmicos do PDF, não a uma auditoria
independente de produção. Extração automática de edital e geração automática
contínua de questões por IA não são exigidas nesses critérios e não foram
concluídas. Docker não foi executado nesta máquina. As quatro questões publicadas
são originais de estudo, não questões oficiais de provas. Sem chamadas pagas de IA.
