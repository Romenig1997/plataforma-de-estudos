-- ---------------------------------------------------------------------------
-- Row Level Security: isolamento dos dados por usuario.
--
-- Pre-requisitos: V18 do Flyway e 20261018000100_perfis_supabase_auth.sql.
-- Idempotente: cada politica e recriada.
--
-- Por que isto importa: o frontend passa a carregar a chave publica do
-- Supabase (anon/publishable). Com ela, qualquer pessoa consegue chamar a Data
-- API (PostgREST) diretamente. Sem RLS, todas as tabelas do schema public
-- ficariam legiveis por essa chave. Com RLS:
--   * anon nao le nem grava nada (nenhuma politica para anon);
--   * o aluno so ve e altera as proprias linhas;
--   * o ADMIN le os dados de gestao, mas o papel so muda pelo backend;
--   * tabelas internas (PDF do edital, importacoes, historico do Flyway) ficam
--     fechadas para a Data API.
--
-- O backend Java conecta com o usuario do banco (dono das tabelas), que nao e
-- afetado pelo RLS. Nele, o isolamento e garantido pelas consultas filtradas
-- pelo usuario da sessao, cobertas pelos testes de integracao.
-- ---------------------------------------------------------------------------

-- Funcoes auxiliares. SECURITY DEFINER evita recursao do RLS ao consultar
-- usuario/perfil dentro das proprias politicas.
create or replace function public.usuario_atual_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from public.usuario u where u.auth_id = (select auth.uid())
$$;

create or replace function public.usuario_eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.usuario u
      join public.perfil p on p.id = u.perfil_id
     where u.auth_id = (select auth.uid())
       and p.nome = 'ADMIN')
$$;

revoke execute on function public.usuario_atual_id() from public, anon;
revoke execute on function public.usuario_eh_admin() from public, anon;
grant execute on function public.usuario_atual_id() to authenticated;
grant execute on function public.usuario_eh_admin() to authenticated;

-- RLS ligado em TODAS as tabelas do schema public, inclusive as que nao tem
-- politica (essas ficam totalmente fechadas para anon e authenticated).
do $$
declare
  tabela record;
begin
  for tabela in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', tabela.tablename);
  end loop;
end $$;

-- Tabelas criadas no futuro pelo Flyway nao nascem expostas a Data API.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

-- A chave publica sem login nao tem uso para a Data API desta aplicacao.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- Perfil (usuario) e catalogo de papeis
-- ---------------------------------------------------------------------------
drop policy if exists "usuario: dono ou admin le" on public.usuario;
create policy "usuario: dono ou admin le" on public.usuario
  for select to authenticated
  using (auth_id = (select auth.uid()) or (select public.usuario_eh_admin()));

drop policy if exists "usuario: dono altera o proprio perfil" on public.usuario;
create policy "usuario: dono altera o proprio perfil" on public.usuario
  for update to authenticated
  using (auth_id = (select auth.uid()))
  with check (auth_id = (select auth.uid()));

-- O aluno so pode alterar campos de perfil. Papel, e-mail e vinculo com o Auth
-- ficam fora do alcance da Data API (impede autopromocao a ADMIN).
revoke insert, update, delete on public.usuario from authenticated;
grant update (nome, avatar_url, meta_estudo_semanal, objetivo_motivacao, atualizado_em)
  on public.usuario to authenticated;

drop policy if exists "perfil: autenticado le" on public.perfil;
create policy "perfil: autenticado le" on public.perfil
  for select to authenticated using (true);
revoke insert, update, delete on public.perfil from authenticated;

-- ---------------------------------------------------------------------------
-- Catalogo de editais: leitura para autenticados, escrita apenas para ADMIN
-- ---------------------------------------------------------------------------
do $$
declare
  tabela text;
begin
  foreach tabela in array array['edital', 'concurso', 'cargo', 'disciplina', 'conteudo'] loop
    execute format('drop policy if exists "%1$s: autenticado le" on public.%1$I', tabela);
    execute format('create policy "%1$s: autenticado le" on public.%1$I for select to authenticated using (true)', tabela);
    execute format('drop policy if exists "%1$s: admin gerencia" on public.%1$I', tabela);
    execute format('create policy "%1$s: admin gerencia" on public.%1$I for all to authenticated '
                   'using ((select public.usuario_eh_admin())) with check ((select public.usuario_eh_admin()))', tabela);
  end loop;
end $$;

-- Arquivos e importacoes: apenas ADMIN le pela Data API.
do $$
declare
  tabela text;
begin
  foreach tabela in array array['edital_pdf', 'edital_banner', 'importacao_edital'] loop
    execute format('drop policy if exists "%1$s: admin le" on public.%1$I', tabela);
    execute format('create policy "%1$s: admin le" on public.%1$I for select to authenticated '
                   'using ((select public.usuario_eh_admin()))', tabela);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Questoes: o aluno ve as publicadas, mas nunca o gabarito nem a explicacao
-- (a correcao acontece no backend).
-- ---------------------------------------------------------------------------
drop policy if exists "questao: publicada ou admin" on public.questao;
create policy "questao: publicada ou admin" on public.questao
  for select to authenticated
  using (publicada or (select public.usuario_eh_admin()));
revoke select, insert, update, delete on public.questao from authenticated;
grant select (id, edital_id, conteudo_id, enunciado, publicada) on public.questao to authenticated;

drop policy if exists "questao_alternativa: de questao publicada" on public.questao_alternativa;
create policy "questao_alternativa: de questao publicada" on public.questao_alternativa
  for select to authenticated
  using (exists (select 1 from public.questao q
                  where q.id = questao_id
                    and (q.publicada or (select public.usuario_eh_admin()))));
revoke insert, update, delete on public.questao_alternativa from authenticated;

-- Respostas: o aluno le o proprio historico; a gravacao passa pelo backend,
-- que corrige a resposta (o campo "correta" nao pode vir do cliente).
drop policy if exists "resposta_questao: dono ou admin le" on public.resposta_questao;
create policy "resposta_questao: dono ou admin le" on public.resposta_questao
  for select to authenticated
  using (usuario_id = (select public.usuario_atual_id()) or (select public.usuario_eh_admin()));
revoke insert, update, delete on public.resposta_questao from authenticated;

-- ---------------------------------------------------------------------------
-- Dados de estudo com usuario_id: o dono le e grava; o admin apenas le
-- ---------------------------------------------------------------------------
do $$
declare
  tabela text;
begin
  foreach tabela in array array['plano_estudo', 'cronograma_estudo', 'registro_estudo', 'foto_perfil'] loop
    execute format('drop policy if exists "%1$s: dono ou admin le" on public.%1$I', tabela);
    execute format('create policy "%1$s: dono ou admin le" on public.%1$I for select to authenticated '
                   'using (usuario_id = (select public.usuario_atual_id()) or (select public.usuario_eh_admin()))', tabela);
    execute format('drop policy if exists "%1$s: dono grava" on public.%1$I', tabela);
    execute format('create policy "%1$s: dono grava" on public.%1$I for insert to authenticated '
                   'with check (usuario_id = (select public.usuario_atual_id()))', tabela);
    execute format('drop policy if exists "%1$s: dono altera" on public.%1$I', tabela);
    execute format('create policy "%1$s: dono altera" on public.%1$I for update to authenticated '
                   'using (usuario_id = (select public.usuario_atual_id())) '
                   'with check (usuario_id = (select public.usuario_atual_id()))', tabela);
    execute format('drop policy if exists "%1$s: dono exclui" on public.%1$I', tabela);
    execute format('create policy "%1$s: dono exclui" on public.%1$I for delete to authenticated '
                   'using (usuario_id = (select public.usuario_atual_id()))', tabela);
  end loop;
end $$;

-- Tabelas filhas: o dono e o do plano ou do cronograma ao qual pertencem.
create or replace function public.plano_do_usuario_atual(p_plano_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.plano_estudo p
                  where p.id = p_plano_id and p.usuario_id = public.usuario_atual_id())
$$;

create or replace function public.cronograma_do_usuario_atual(p_cronograma_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.cronograma_estudo c
                  where c.id = p_cronograma_id and c.usuario_id = public.usuario_atual_id())
$$;

revoke execute on function public.plano_do_usuario_atual(bigint) from public, anon;
revoke execute on function public.cronograma_do_usuario_atual(bigint) from public, anon;
grant execute on function public.plano_do_usuario_atual(bigint) to authenticated;
grant execute on function public.cronograma_do_usuario_atual(bigint) to authenticated;

drop policy if exists "plano_disciplina: dono ou admin le" on public.plano_disciplina;
create policy "plano_disciplina: dono ou admin le" on public.plano_disciplina
  for select to authenticated
  using (public.plano_do_usuario_atual(plano_id) or (select public.usuario_eh_admin()));
drop policy if exists "plano_disciplina: dono gerencia" on public.plano_disciplina;
create policy "plano_disciplina: dono gerencia" on public.plano_disciplina
  for all to authenticated
  using (public.plano_do_usuario_atual(plano_id))
  with check (public.plano_do_usuario_atual(plano_id));

do $$
declare
  tabela text;
begin
  foreach tabela in array array['disponibilidade_estudo', 'atividade_estudo', 'cronograma_plano'] loop
    execute format('drop policy if exists "%1$s: dono ou admin le" on public.%1$I', tabela);
    execute format('create policy "%1$s: dono ou admin le" on public.%1$I for select to authenticated '
                   'using (public.cronograma_do_usuario_atual(cronograma_id) or (select public.usuario_eh_admin()))', tabela);
    execute format('drop policy if exists "%1$s: dono gerencia" on public.%1$I', tabela);
    execute format('create policy "%1$s: dono gerencia" on public.%1$I for all to authenticated '
                   'using (public.cronograma_do_usuario_atual(cronograma_id)) '
                   'with check (public.cronograma_do_usuario_atual(cronograma_id))', tabela);
  end loop;
end $$;

-- flyway_schema_history: RLS ligado e nenhuma politica (fechada para a Data API).

-- RLS define quais linhas podem ser acessadas, mas nao concede privilegios SQL.
-- Os grants abaixo liberam somente as operacoes que as politicas ja filtram.
grant select on public.usuario, public.perfil, public.profiles to authenticated;
grant select, insert, update, delete
  on public.edital, public.concurso, public.cargo, public.disciplina, public.conteudo,
     public.plano_estudo, public.cronograma_estudo, public.registro_estudo, public.foto_perfil,
     public.plano_disciplina, public.disponibilidade_estudo, public.atividade_estudo,
     public.cronograma_plano
  to authenticated;
grant select on public.edital_pdf, public.edital_banner, public.importacao_edital,
                public.questao_alternativa, public.resposta_questao
  to authenticated;
