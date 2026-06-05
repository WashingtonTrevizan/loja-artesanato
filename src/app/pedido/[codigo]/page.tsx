'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase/client';
import { formatBRL } from '@/lib/types';

const STEPS = [
  { key: 'aguardando_pagamento', label: 'Aguardando pagamento', emoji: '🕐' },
  { key: 'pago', label: 'Pagamento confirmado', emoji: '✅' },
  { key: 'em_producao', label: 'Em produção', emoji: '🧵' },
  { key: 'postado', label: 'Postado nos Correios', emoji: '📦' },
  { key: 'entregue', label: 'Entregue', emoji: '🎉' },
];

export default function OrderTrackingPage({ params }: { params: { codigo: string } }) {
  const [order, setOrder] = useState<any | null | undefined>(undefined);
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_ARTESA;

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc('get_order_by_code', { p_code: params.codigo });
      setOrder(data ?? null);
    })();
  }, [params.codigo]);

  if (order === undefined)
    return (
      <>
        <Header />
        <p className="mt-12 text-center text-stone-400">Carregando seu pedido...</p>
      </>
    );

  if (order === null)
    return (
      <>
        <Header />
        <p className="mt-12 text-center text-stone-500">Pedido não encontrado. Confira o link.</p>
      </>
    );

  const currentIdx = STEPS.findIndex((s) => s.key === order.status);
  const cancelado = order.status === 'cancelado';

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 pb-24">
        <h1 className="mt-6 text-2xl font-bold">Seu pedido, {order.customer_name.split(' ')[0]} 💛</h1>
        <p className="text-sm text-stone-500">
          Guarde o link desta página para acompanhar a entrega.
        </p>

        {cancelado ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-red-700">
            Este pedido foi cancelado. Se achar que foi um engano, fale com a gente no WhatsApp.
          </div>
        ) : (
          <ol className="mt-4 space-y-1 rounded-2xl bg-white p-4 shadow-sm">
            {STEPS.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3 py-1.5">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                    i <= currentIdx ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {s.emoji}
                </span>
                <span className={i <= currentIdx ? 'font-medium' : 'text-stone-400'}>
                  {s.label}
                  {s.key === 'postado' && order.tracking_code && i <= currentIdx && (
                    <span className="block text-xs text-stone-500">
                      Rastreio: <strong>{order.tracking_code}</strong> (busque em rastreamento.correios.com.br)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          {order.items.map((i: any, idx: number) => (
            <div key={idx} className="flex justify-between py-1 text-sm">
              <span>
                {i.qty}x {i.product_name}
                {i.variant_name ? ` (${i.variant_name})` : ''}
              </span>
              <span>{formatBRL(i.unit_price_cents * i.qty)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 font-bold">
            <span>Total</span>
            <span className="text-brand-600">{formatBRL(order.total_cents)}</span>
          </div>
        </div>

        {order.status === 'aguardando_pagamento' && (
          <a
            href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
              `Olá! Acabei de fazer um pedido no site (código ${params.codigo.slice(0, 8)}). Como faço o pagamento?`
            )}`}
            target="_blank"
            className="mt-4 block w-full rounded-full bg-green-600 py-4 text-center text-lg font-bold text-white shadow-md"
          >
            Combinar pagamento no WhatsApp 💬
          </a>
        )}
      </main>
    </>
  );
}
