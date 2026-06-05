import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Cria a "preferência" do Mercado Pago (a página de pagamento) para um pedido.
export async function POST(req: Request) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    // Mercado Pago ainda não configurado: o site segue no modo "combinar via WhatsApp"
    return NextResponse.json({ init_point: null });
  }

  const { access_code } = await req.json();
  if (!access_code) return NextResponse.json({ error: 'missing access_code' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: order } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('access_code', access_code)
    .single();

  if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });
  if (order.status !== 'aguardando_pagamento')
    return NextResponse.json({ error: 'order not payable' }, { status: 409 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const backUrl = `${site}/pedido/${order.access_code}`;

  const preference = {
    external_reference: order.id,
    items: order.order_items.map((i: any) => ({
      title: i.product_name + (i.variant_name ? ` (${i.variant_name})` : ''),
      quantity: i.qty,
      unit_price: i.unit_price_cents / 100,
      currency_id: 'BRL',
    })),
    payer: { email: order.customer_email, name: order.customer_name },
    back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
    auto_return: 'approved',
    notification_url: `${site}/api/mp/webhook`,
    statement_descriptor: (process.env.NEXT_PUBLIC_NOME_LOJA || 'LOJA').slice(0, 22),
    // Pix expira junto com a reserva de estoque (30 min)
    date_of_expiration: order.expires_at,
  };

  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(preference),
  });

  if (!r.ok) {
    const body = await r.text();
    console.error('MP preference error:', r.status, body);
    return NextResponse.json({ error: 'mp_error' }, { status: 502 });
  }

  const data = await r.json();
  return NextResponse.json({ init_point: data.init_point });
}
