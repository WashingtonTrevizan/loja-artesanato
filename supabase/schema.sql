-- =============================================================
-- LOJA DE ARTESANATO - Schema Fase 0 (Fundação)
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- =============================================================

-- 1. CATEGORIAS ------------------------------------------------
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  -- valores padrão de frete por categoria (mitigação de risco do PRD:
  -- peso/dimensões errados -> frete subcotado)
  default_weight_grams int not null default 300,
  default_length_cm int not null default 25,
  default_width_cm int not null default 18,
  default_height_cm int not null default 8,
  position int not null default 0
);

insert into categories (name, slug, default_weight_grams, default_length_cm, default_width_cm, default_height_cm, position) values
  ('Necessaires', 'necessaire', 200, 22, 15, 8, 1),
  ('Bolsas',      'bolsa',      450, 35, 30, 12, 2),
  ('Roupas',      'roupa',      350, 30, 25, 5, 3),
  ('Outros',      'outros',     300, 25, 18, 8, 4)
on conflict (slug) do nothing;

-- 2. PRODUTOS --------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  description text not null default '',
  price_cents int not null check (price_cents > 0),
  category_id uuid not null references categories(id),
  -- pronta_entrega: estoque finito | sob_encomenda: prazo de produção
  product_type text not null default 'pronta_entrega'
    check (product_type in ('pronta_entrega', 'sob_encomenda')),
  production_days int check (production_days is null or production_days > 0),
  stock int not null default 0 check (stock >= 0),
  -- peso e dimensões obrigatórios (alimentam cotação de frete na Fase 1)
  weight_grams int not null check (weight_grams > 0),
  length_cm int not null check (length_cm > 0),
  width_cm int not null check (width_cm > 0),
  height_cm int not null check (height_cm > 0),
  -- variações: 1 nível por produto (ex.: "Tamanho" ou "Estampa")
  variant_label text,
  active boolean not null default true
);

create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active on products(active);

-- 3. VARIAÇÕES (cada uma com estoque próprio e foto opcional) --
create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  stock int not null default 0 check (stock >= 0),
  image_url text,
  position int not null default 0
);

create index if not exists idx_variants_product on product_variants(product_id);

-- 4. FOTOS DO PRODUTO ------------------------------------------
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  position int not null default 0
);

create index if not exists idx_images_product on product_images(product_id);

-- 5. SEGURANÇA (RLS) -------------------------------------------
-- Público: só leitura de produtos ativos.
-- Artesã logada (authenticated): pode tudo.
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;

create policy "categorias visiveis para todos" on categories
  for select using (true);

create policy "produtos ativos visiveis para todos" on products
  for select using (active = true or auth.role() = 'authenticated');

create policy "admin gerencia produtos" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "variacoes visiveis para todos" on product_variants
  for select using (true);

create policy "admin gerencia variacoes" on product_variants
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "fotos visiveis para todos" on product_images
  for select using (true);

create policy "admin gerencia fotos" on product_images
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 6. STORAGE (bucket público para fotos de produto) ------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "fotos publicas para leitura" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "admin envia fotos" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "admin remove fotos" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');
