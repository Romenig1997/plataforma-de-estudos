-- ---------------------------------------------------------------------------
-- Diagnostico do cadastro (erro "unexpected_failure" / "Database error saving
-- new user" no Supabase Auth). Execute no SQL Editor do Supabase.
--
-- SOMENTE LEITURA: nenhuma consulta altera o banco.
--
-- O Supabase Auth devolve unexpected_failure quando o INSERT em auth.users
-- falha dentro do banco, quase sempre por um gatilho. Cada consulta indica o
-- resultado esperado; qualquer divergencia aponta a causa.
-- ---------------------------------------------------------------------------

-- 1. Migrations do Flyway aplicadas (esperado: V17 e V18 com success = true).
select version, description, installed_on, success
  from public.flyway_schema_history
 order by installed_rank;

-- 2. Gatilhos em auth.users (esperado: somente ao_criar_usuario_auth e
--    ao_confirmar_usuario_auth, ambos chamando sincronizar_perfil_do_auth).
--    Qualquer outro gatilho, como on_auth_user_created, e suspeito.
select t.tgname as gatilho, t.tgfoid::regprocedure as funcao, t.tgenabled as habilitado
  from pg_trigger t
 where t.tgrelid = 'auth.users'::regclass
   and not t.tgisinternal;

-- 3. Gatilhos em public.usuario (esperado: 0 linhas).
select t.tgname as gatilho, t.tgfoid::regprocedure as funcao
  from pg_trigger t
 where t.tgrelid = 'public.usuario'::regclass
   and not t.tgisinternal;

-- 4. Funcoes que ainda citam colunas ou tabelas removidas pela V18
--    (esperado: 0 linhas). O DROP COLUMN nao acusa funcoes PL/pgSQL.
select n.nspname as schema, p.proname as funcao
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname not in ('pg_catalog', 'information_schema')
   and (p.prosrc ilike '%senha_hash%'
        or p.prosrc ilike '%sessao_versao%'
        or p.prosrc ilike '%token_conta%');

-- 5. Colunas de usuario (esperado: auth_id presente; senha_hash e
--    sessao_versao ausentes; criado_em e atualizado_em com default).
select column_name, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'usuario'
 order by ordinal_position;

-- 6. Colunas NOT NULL sem default que o gatilho NAO preenche (esperado: 0
--    linhas). O gatilho grava nome, email, perfil_id, auth_id,
--    email_verificado, criado_em e atualizado_em.
select column_name
  from information_schema.columns
 where table_schema = 'public' and table_name = 'usuario'
   and is_nullable = 'NO' and column_default is null
   and column_name not in ('id', 'nome', 'email', 'perfil_id', 'auth_id',
                           'email_verificado', 'criado_em', 'atualizado_em');

-- 7. Perfil ALUNO semeado (esperado: 1 linha). Sem ele, perfil_id fica nulo.
select id, nome from public.perfil where nome = 'ALUNO';

-- 8. Restricao unica usada pelo "on conflict (email)" do gatilho
--    (esperado: uk_usuario_email).
select conname
  from pg_constraint
 where conrelid = 'public.usuario'::regclass and contype = 'u';

-- 9. Ultimos cadastros no Auth e o perfil correspondente. Uma identidade sem
--    usuario_id vinculado indica gatilho ausente ou com falha.
select a.created_at, a.email_confirmed_at is not null as confirmado,
       u.id as usuario_id, p.nome as papel
  from auth.users a
  left join public.usuario u on u.auth_id = a.id
  left join public.perfil p on p.id = u.perfil_id
 order by a.created_at desc
 limit 10;
