-- Rode este script SOZINHO se o upload de fotos falhar.
-- Se der erro "must be owner of table objects", crie pelo painel
-- (instruções no README, seção "Fotos não sobem?").
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "fotos publicas para leitura" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "admin envia fotos" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "admin remove fotos" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
