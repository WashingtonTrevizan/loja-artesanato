-- =============================================================
-- FASE 1 / Entrega 1: PEDIDOS + RESERVA DE ESTOQUE
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.
-- =============================================================

-- 1. TABELAS ----------------------------------------------------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- código que a compradora usa para acompanhar o pedido (link)
  access_code uuid not null unique default gen_random_uuid(),
  status text not null default 'aguardando_pagamento' check (status in
    ('aguardando_pagamento','pago','em_producao','postado','entregue','cancelado')),
  customer_name text not null,
  customer_email text not null,
  customer_whatsapp text not null,
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  subtotal_cents int not null,
  shipping_cents int not null default 0,
  total_cents int not null,
  tracking_code text,
  -- reserva de estoque: pedidos não pagos expiram (PRD: 30 min)
  expires_at timestamptz
);

create index if not exists idx_orders_status on orders(status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references product_variants(id) on delete set null,
  product_name text not null,
  variant_name text,
  product_type text not null,
  qty int not null check (qty > 0),
  unit_price_cents int not null
);

create index if not exists idx_order_items_order on order_items(order_id);

-- 2. SEGURANÇA --------------------------------------------------
-- Pedidos têm dados pessoais: só a artesã (authenticated) lê/edita.
-- Compradora anônima cria e consulta SOMENTE via funções abaixo.
alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "admin le pedidos" on orders;
create policy "admin le pedidos" on orders
  for select using (auth.role() = 'authenticated');
drop policy if exists "admin atualiza pedidos" on orders;
create policy "admin atualiza pedidos" on orders
  for update using (auth.role() = 'authenticated');
drop policy if exists "admin le itens" on order_items;
create policy "admin le itens" on order_items
  for select using (auth.role() = 'authenticated');

-- 3. CRIAR PEDIDO (chamada pelo site, valida e reserva estoque) --
create or replace function create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_access_code uuid;
  v_item jsonb;
  v_product products%rowtype;
  v_variant product_variants%rowtype;
  v_subtotal int := 0;
  v_price int;
  v_qty int;
begin
  -- valida itens e calcula subtotal com preços DO BANCO (nunca do cliente)
  if jsonb_array_length(p->'items') = 0 then
    raise exception 'Pedido sem itens';
  end if;

  insert into orders (customer_name, customer_email, customer_whatsapp,
    cep, street, number, complement, neighborhood, city, state,
    subtotal_cents, shipping_cents, total_cents, expires_at)
  values (
    p->>'customer_name', p->>'customer_email', p->>'customer_whatsapp',
    p->>'cep', p->>'street', p->>'number', p->>'complement',
    p->>'neighborhood', p->>'city', p->>'state',
    0, 0, 0, now() + interval '30 minutes')
  returning id, access_code into v_order_id, v_access_code;

  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_qty := (v_item->>'qty')::int;

    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and active = true;
    if not found then
      raise exception 'Produto não encontrado ou indisponível';
    end if;
    v_price := v_product.price_cents;

    if v_item->>'variant_id' is not null then
      -- trava a linha da variação e reserva estoque
      select * into v_variant from product_variants
        where id = (v_item->>'variant_id')::uuid and product_id = v_product.id
        for update;
      if not found then
        raise exception 'Variação não encontrada';
      end if;
      if v_product.product_type = 'pronta_entrega' then
        if v_variant.stock < v_qty then
          raise exception 'Estoque insuficiente para %', v_product.name;
        end if;
        update product_variants set stock = stock - v_qty where id = v_variant.id;
      end if;
    elsif v_product.product_type = 'pronta_entrega' then
      perform 1 from products where id = v_product.id for update;
      if v_product.stock < v_qty then
        raise exception 'Estoque insuficiente para %', v_product.name;
      end if;
      update products set stock = stock - v_qty where id = v_product.id;
    end if;

    insert into order_items (order_id, product_id, variant_id, product_name,
      variant_name, product_type, qty, unit_price_cents)
    values (v_order_id, v_product.id, (v_item->>'variant_id')::uuid,
      v_product.name, v_variant.name, v_product.product_type, v_qty, v_price);

    v_subtotal := v_subtotal + v_price * v_qty;
    v_variant := null;
  end loop;

  update orders set subtotal_cents = v_subtotal, total_cents = v_subtotal
    where id = v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'access_code', v_access_code);
end;
$$;

-- 4. CONSULTAR PEDIDO PELO CÓDIGO (compradora, sem login) --------
create or replace function get_order_by_code(p_code uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders%rowtype;
  v_items jsonb;
begin
  select * into v_order from orders where access_code = p_code;
  if not found then return null; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_name', product_name, 'variant_name', variant_name,
    'qty', qty, 'unit_price_cents', unit_price_cents)), '[]'::jsonb)
  into v_items from order_items where order_id = v_order.id;

  -- devolve só o necessário (sem expor dados além do dono do link)
  return jsonb_build_object(
    'status', v_order.status,
    'created_at', v_order.created_at,
    'customer_name', v_order.customer_name,
    'subtotal_cents', v_order.subtotal_cents,
    'shipping_cents', v_order.shipping_cents,
    'total_cents', v_order.total_cents,
    'tracking_code', v_order.tracking_code,
    'items', v_items);
end;
$$;

-- 5. CANCELAR PEDIDO (artesã) — devolve estoque reservado --------
create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item order_items%rowtype;
  v_status text;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Sem permissão';
  end if;
  select status into v_status from orders where id = p_order_id for update;
  if v_status is null or v_status = 'cancelado' then return; end if;

  for v_item in select * from order_items where order_id = p_order_id loop
    if v_item.product_type = 'pronta_entrega' then
      if v_item.variant_id is not null then
        update product_variants set stock = stock + v_item.qty where id = v_item.variant_id;
      elsif v_item.product_id is not null then
        update products set stock = stock + v_item.qty where id = v_item.product_id;
      end if;
    end if;
  end loop;

  update orders set status = 'cancelado' where id = p_order_id;
end;
$$;

-- 6. LIBERAR RESERVAS EXPIRADAS (chamada ao abrir o painel) ------
create or replace function release_expired_orders()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count int := 0;
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Sem permissão';
  end if;
  for v_order in
    select id from orders
    where status = 'aguardando_pagamento' and expires_at < now()
  loop
    -- reaproveita a devolução de estoque do cancelamento
    perform cancel_order(v_order.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- permissões de execução
revoke all on function create_order(jsonb) from public;
grant execute on function create_order(jsonb) to anon, authenticated;
revoke all on function get_order_by_code(uuid) from public;
grant execute on function get_order_by_code(uuid) to anon, authenticated;
revoke all on function cancel_order(uuid) from public;
grant execute on function cancel_order(uuid) to authenticated;
revoke all on function release_expired_orders() from public;
grant execute on function release_expired_orders() to authenticated;
