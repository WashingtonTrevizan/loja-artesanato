-- FASE 1 / Entrega 2: colunas de pagamento (Mercado Pago)
alter table orders add column if not exists mp_payment_id text;
alter table orders add column if not exists paid_at timestamptz;
