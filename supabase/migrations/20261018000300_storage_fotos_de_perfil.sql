-- ---------------------------------------------------------------------------
-- Supabase Storage: fotos de perfil.
--
-- Bucket "avatars" publico para leitura: a URL salva em usuario.avatar_url
-- abre a imagem diretamente. O caminho de cada arquivo comeca pelo id do
-- usuario no Supabase Auth ({auth.uid()}/avatar-....png), e as politicas
-- abaixo so deixam cada pessoa enviar, trocar ou apagar arquivos na propria
-- pasta.
--
-- O backend envia a foto ja normalizada (PNG de ate 512 px, sem metadados)
-- usando o token da propria pessoa. Assim estas politicas valem tambem para
-- o backend, que nao precisa da chave service_role.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars: dono le a propria pasta" on storage.objects;
create policy "avatars: dono le a propria pasta" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: dono envia na propria pasta" on storage.objects;
create policy "avatars: dono envia na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: dono substitui na propria pasta" on storage.objects;
create policy "avatars: dono substitui na propria pasta" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "avatars: dono apaga na propria pasta" on storage.objects;
create policy "avatars: dono apaga na propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
