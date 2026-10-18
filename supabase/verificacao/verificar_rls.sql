-- ---------------------------------------------------------------------------
-- Verificacao do RLS. Execute no SQL Editor do Supabase DEPOIS das migrations.
--
-- Tudo roda dentro de uma transacao encerrada com ROLLBACK: os dois alunos de
-- teste e os registros criados aqui nao ficam no banco.
--
-- Cada consulta "esperado: ..." deve devolver exatamente o valor indicado.
-- Se alguma divergir, o RLS nao esta isolando os dados como deveria.
-- ---------------------------------------------------------------------------

begin;

-- As identidades abaixo existem apenas neste teste. Desabilita a FK com
-- auth.users durante a transacao, sem alterar o banco apos o ROLLBACK.
set local session_replication_role = replica;

-- 1. Nenhuma tabela do schema public sem RLS (esperado: 0 linhas).
select tablename as tabela_sem_rls
  from pg_tables
 where schemaname = 'public' and not rowsecurity;

-- 2. Dois alunos de teste com identidades ficticias.
insert into public.usuario (nome, email, perfil_id, auth_id, email_verificado)
values ('Aluno A (teste RLS)', 'rls.a@teste.invalid', (select id from public.perfil where nome = 'ALUNO'),
        '00000000-0000-4000-8000-00000000000a', true),
       ('Aluno B (teste RLS)', 'rls.b@teste.invalid', (select id from public.perfil where nome = 'ALUNO'),
        '00000000-0000-4000-8000-00000000000b', true);

insert into public.registro_estudo (usuario_id, conteudo_id, concluido, atualizado_em)
select u.id, (select min(id) from public.conteudo), true, now()
  from public.usuario u
 where u.email = 'rls.b@teste.invalid'
   and exists (select 1 from public.conteudo);

-- 3. Passa a agir como o Aluno A, do mesmo jeito que a Data API faz.
set local role authenticated;
select set_config('request.jwt.claims',
                  '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);

-- esperado: 1 (so o proprio perfil)
select count(*) as perfis_visiveis_para_a from public.usuario;

-- esperado: 0 (o registro do Aluno B nao aparece)
select count(*) as registros_de_b_visiveis_para_a
  from public.registro_estudo r
  join public.usuario u on u.id = r.usuario_id
 where u.email = 'rls.b@teste.invalid';

-- esperado: 0 linhas alteradas (nao altera o perfil de outro aluno)
update public.usuario set nome = 'invadido' where email = 'rls.b@teste.invalid';

-- esperado: ERRO de permissao (o aluno nao muda o proprio papel).
-- Descomente para conferir; o erro encerra a transacao.
-- update public.usuario set perfil_id = (select id from public.perfil where nome = 'ADMIN');

-- 4. Sem login (chave anon): esperado ERRO "permission denied".
-- set local role anon;
-- select count(*) from public.usuario;

rollback;
