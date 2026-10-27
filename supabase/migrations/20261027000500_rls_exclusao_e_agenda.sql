-- ---------------------------------------------------------------------------
-- RLS das tabelas da V20 (Flyway): identidade_excluida e agenda_do_cronograma.
--
-- As duas sao lidas e gravadas somente pelo backend, que conecta com o dono
-- das tabelas e nao passa pelo RLS. RLS ligado e sem nenhuma politica deixa
-- as duas fechadas para anon e authenticated na Data API: o link secreto da
-- agenda nunca e exposto pela chave publica. Idempotente.
-- ---------------------------------------------------------------------------

alter table public.identidade_excluida  enable row level security;
alter table public.agenda_do_cronograma enable row level security;

revoke all on public.identidade_excluida  from anon, authenticated;
revoke all on public.agenda_do_cronograma from anon, authenticated;
