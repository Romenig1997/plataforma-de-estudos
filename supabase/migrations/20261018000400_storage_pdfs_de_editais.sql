-- ---------------------------------------------------------------------------
-- Supabase Storage: PDFs originais dos editais.
--
-- Bucket proprio e PRIVADO ("editais-pdf"), separado do "avatars" (que e
-- publico e organizado por pasta de usuario). Nada aqui e lido por URL
-- publica: o navegador so abre o PDF por URL assinada de curta duracao, gerada
-- pelo backend com o token de quem pediu.
--
-- Caminho imutavel: editais/{sha256}.pdf. O mesmo conteudo sempre cai no mesmo
-- objeto, que e enviado com cache-control de 1 ano.
--
-- Depende da V19 do Flyway (coluna edital_pdf.caminho_storage) e das funcoes
-- de 20261018000200_rls_isolamento_por_usuario.sql. Idempotente.
--
-- Quem pode o que (o backend usa sempre o token da pessoa, nunca service_role):
--   * ADMIN: envia, substitui, le e apaga (importacao e exclusao de curso);
--   * qualquer conta autenticada: le apenas PDFs ligados a um curso publicado
--     (linha em public.edital), o mesmo que GET /api/editais/{id}/pdf permite;
--   * anon: nada.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('editais-pdf', 'editais-pdf', false, 31457280, array['application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- SECURITY DEFINER: edital_pdf so e legivel por ADMIN no RLS, e a politica do
-- aluno precisa saber se o objeto pertence a um curso publicado.
create or replace function public.pdf_de_curso_publicado(p_caminho text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.edital_pdf p
      join public.edital e on e.edital_pdf_id = p.id
     where p.caminho_storage = p_caminho)
$$;

revoke execute on function public.pdf_de_curso_publicado(text) from public, anon;
grant execute on function public.pdf_de_curso_publicado(text) to authenticated;

drop policy if exists "editais-pdf: admin ou curso publicado le" on storage.objects;
create policy "editais-pdf: admin ou curso publicado le" on storage.objects
  for select to authenticated
  using (bucket_id = 'editais-pdf'
         and ((select public.usuario_eh_admin()) or public.pdf_de_curso_publicado(name)));

drop policy if exists "editais-pdf: admin envia" on storage.objects;
create policy "editais-pdf: admin envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'editais-pdf' and (select public.usuario_eh_admin()));

drop policy if exists "editais-pdf: admin substitui" on storage.objects;
create policy "editais-pdf: admin substitui" on storage.objects
  for update to authenticated
  using (bucket_id = 'editais-pdf' and (select public.usuario_eh_admin()))
  with check (bucket_id = 'editais-pdf' and (select public.usuario_eh_admin()));

drop policy if exists "editais-pdf: admin apaga" on storage.objects;
create policy "editais-pdf: admin apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'editais-pdf' and (select public.usuario_eh_admin()));
