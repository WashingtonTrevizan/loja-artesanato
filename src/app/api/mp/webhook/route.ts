import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Webhook do Mercado Pago: confirma pagamento e marca o pedido como pago.
// Estratégia de segurança: NUNCA confiamos no corpo da notificação —
// usamos só o ID e reconsultamos a API do MP (fonte da verdade).
// Idempotente: processar a mesma notificação 2x não causa efeito duplo.
export async function POST(req: Request) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ ok: true });

  let paymentId: string | null = null;
  const url = new URL(req.url);
  if (url.searchParams.get('type') === 'payment') {
    paymentId = url.searchParams.get('data.id');
  }
  if (!paymentId) {
    try {
      const body = await req.json();
      if (body?.type === 'payment') paymentId = String(body?.data?.id ?? '');
    } catch {}
  }
  // outros eventos (merchant_order etc.): responde 200 e ignora
  if (!paymentId) return NextResponse.json({ ok: true });

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) {
    // 5xx faz o MP reenviar a notificação depois (retry automático)
    return NextResponse.json({ error: 'mp_fetch_failed' }, { status: 502 });
  }
  const payment = await r.json();
  const orderId = payment.external_reference;
  if (!orderId) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();

  if (payment.status === 'approved') {
    // idempotência: só transiciona se ainda estiver aguardando
    await supabase
      .from('orders')
      .update({
        status: 'pago',
        mp_payment_id: String(payment.id),
        paid_at: new Date().toISOString(),
        expires_at: null,
      })
      .eq('id', orderId)
      .eq('status', 'aguardando_pagamento');
  }

  return NextResponse.json({ ok: true });
}
