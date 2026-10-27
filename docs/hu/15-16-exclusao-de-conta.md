# HU15 e HU16 — Exclusão de contas

**Status:** Implementadas e validadas localmente em 27/10/2026 (EPIC 2).
**Dependências:** HU01 a HU05.

## Critérios de aceite

**HU15 — Gestão de alunos (administrador)**

1. A lista exibe nome, e-mail, perfil e data de cadastro.
2. O administrador busca por nome ou e-mail e filtra por perfil.
3. O administrador altera o perfil entre ALUNO e ADMIN.
4. O administrador exclui um aluno após confirmação, removendo todos os seus dados.

**HU16 — Exclusão da própria conta (aluno)**

1. A opção de exclusão fica disponível no perfil.
2. A exclusão exige confirmação do candidato (a senha é pedida de novo).
3. São removidos os dados de estudo, a foto e o acesso à conta.
4. Após a exclusão a sessão é encerrada e o e-mail pode ser usado em um novo cadastro.

## Comportamento

- `DELETE /api/admin/usuarios/{id}` (só ADMIN) e `DELETE /api/perfil` (a própria
  conta), ambos `204`.
- `ExclusaoDeContaService` apaga, numa única transação: atividades,
  disponibilidades, cronograma, planos, aulas concluídas, respostas, foto, link
  da agenda, o perfil e a identidade em `auth.users`. Se algo falhar, nada é apagado.
- Contas ADMIN não são excluídas: o perfil precisa voltar para ALUNO antes. O
  admin também não exclui a própria conta pela gestão de alunos.
- O access token emitido antes da exclusão continua válido por até 1 hora no
  Supabase; o id fica em `identidade_excluida` (V20) e o backend recusa esse
  token em vez de recriar um perfil vazio. Um novo cadastro com o mesmo e-mail
  recebe outro id e entra normalmente.
- O backend remove o login pela própria conexão com o banco
  (`DELETE FROM auth.users`), sem chave service_role.
- Na exclusão pelo próprio aluno, a foto também sai do Storage. Na exclusão pelo
  admin, o arquivo da foto fica na pasta do aluno (só ele pode apagá-la), sem
  vínculo com nenhuma conta.

## Testes

- `ExclusaoDeContaTest` (6): dados e login removidos, token antigo recusado,
  ADMIN protegido, aluno sem acesso à rota de admin, novo cadastro com o mesmo e-mail.
- `TelaAdminAlunos.test.tsx` e `ExclusaoDeConta.test.tsx`: confirmação,
  cancelamento, senha errada não exclui, sessão encerrada.
- Validação local real (Supabase CLI): exclusão pelo aluno e pelo admin, com
  `auth.users`, perfil, planos, cronograma e agenda removidos e login recusado depois.
