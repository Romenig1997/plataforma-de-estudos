-- ---------------------------------------------------------------------------
-- Perfis ligados ao Supabase Auth.
--
-- Pre-requisito: o backend ja aplicou a V17 do Flyway (coluna usuario.auth_id
-- e view profiles). Este arquivo e idempotente: pode ser executado de novo.
--
-- O que faz:
--   1. liga usuario.auth_id a auth.users(id). Se a identidade for excluida no
--      Supabase, o perfil fica sem vinculo, mas o historico de estudo continua;
--   2. cria automaticamente o perfil com papel ALUNO quando alguem se cadastra
--      no Supabase Auth;
--   3. vincula a conta antiga (anterior ao Supabase Auth) com o mesmo e-mail
--      SOMENTE depois que o e-mail for confirmado, para que ninguem assuma o
--      progresso de outra pessoa apenas cadastrando o e-mail dela;
--   4. faz a view profiles respeitar o RLS de quem consulta.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_usuario_auth_user') then
    alter table public.usuario
      add constraint fk_usuario_auth_user
      foreign key (auth_id) references auth.users (id) on delete set null;
  end if;
end $$;

create or replace function public.sincronizar_perfil_do_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email      text    := lower(btrim(new.email));
  v_confirmado boolean := new.email_confirmed_at is not null;
  v_nome       text    := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nome'), ''),
                                        split_part(v_email, '@', 1)), 120);
begin
  -- Identidades sem e-mail (telefone, anonimas) nao viram aluno.
  if v_email is null or v_email = '' then
    return new;
  end if;

  -- Perfil ja vinculado: acompanha a confirmacao e a troca de e-mail.
  update public.usuario
     set email_verificado = v_confirmado,
         -- Nunca colide com o e-mail de outra conta (uk_usuario_email).
         email            = case
                              when exists (select 1 from public.usuario o
                                            where o.email = v_email and o.auth_id is distinct from new.id)
                              then email
                              else v_email
                            end,
         atualizado_em    = now()
   where auth_id = new.id;
  if found then
    return new;
  end if;

  -- Conta antiga com o mesmo e-mail: vincula apenas com e-mail confirmado.
  if v_confirmado then
    update public.usuario
       set auth_id          = new.id,
           email_verificado = true,
           atualizado_em    = now()
     where lower(email) = v_email
       and auth_id is null;
    if found then
      return new;
    end if;
  end if;

  -- Cadastro novo: sempre ALUNO. A promocao a ADMIN e feita pela area admin.
  insert into public.usuario (nome, email, perfil_id, auth_id, email_verificado, criado_em, atualizado_em)
  values (v_nome, v_email, (select p.id from public.perfil p where p.nome = 'ALUNO'),
          new.id, v_confirmado, now(), now())
  on conflict (email) do nothing;

  return new;
end;
$$;

revoke execute on function public.sincronizar_perfil_do_auth() from public, anon, authenticated;

drop trigger if exists ao_criar_usuario_auth on auth.users;
create trigger ao_criar_usuario_auth
  after insert on auth.users
  for each row execute function public.sincronizar_perfil_do_auth();

drop trigger if exists ao_confirmar_usuario_auth on auth.users;
create trigger ao_confirmar_usuario_auth
  after update of email_confirmed_at, email on auth.users
  for each row execute function public.sincronizar_perfil_do_auth();

-- A view criada pelo Flyway passa a aplicar o RLS de quem consulta, e nao o do dono.
alter view public.profiles set (security_invoker = true);
