'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatBRL } from '@/lib/types';

type Order = {
  id: string;
  created_at: string;
  status: string;
  customer_name: string;
  customer_whatsapp: string;
  city: string;
  state: string;
  total_cents: number;
  tracking_code: string | null;
  order_items: {
    product_name: string;
    variant_name: string | null;
    qty: number;
  }[];
};

const STATUS_INFO: Record<string, { label: string; cor: string; proximo?: string; proximoLabel?: string }> = {
  aguardando_pagamento: { label: '🕐 Aguardando pagamento', cor: 'bg-amber-100 text-amber-800', proximo: 'pago', proximoLabel: 'Marcar como Pago ✅' },
  pago: { label: '✅ Pago', cor: 'bg-green-100 text-green-800', proximo: 'em_producao', proximoLabel: 'Começar produção 🧵' },
  em_producao: { label: '🧵 Em produção', cor: 'bg-blue-100 text-blue-800', proximo: 'postado', proximoLabel: 'Marcar como Postado 📦' },
  postado: { label: '📦 Postado', cor: 'bg-purple-100 text-purple-800', proximo: 'entregue', proximoLabel: 'Marcar como Entregue 🎉' },
  entregue: { label: '🎉 Entregue', cor: 'bg-stone-100 text-stone-600' },
  cancelado: { label: '✕ Cancelado', cor: 'bg-red-100 text-red-700' },
};

const MSG_WHATSAPP: Record<string, string> = {
  aguardando_pagamento: 'Olá NOME! Recebi seu pedido 💛 Vamos combinar o pagamento?',
  pago: 'Olá NOME! Pagamento confirmado, obrigada! 💛 Já vou preparar seu pedido.',
  em_producao: 'Olá NOME! Seu pedido está sendo feito com todo carinho 🧵',
  postado: 'Olá NOME! Seu pedido foi postado nos Correios 📦 RASTREIO',
  entregue: 'Olá NOME! Vi que seu pedido chegou 🎉 Espero que ame! Qualquer coisa me chama.',
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filtro, setFiltro] = useState('ativos');
  const [loading, setLoading] = useState(true);
  const [trackingDraft, setTrackingDraft] = useState<Record<string, string>>({});

  async function load() {
    const supabase = createClient();
    // libera reservas de pedidos não pagos que expiraram (devolve estoque)
    await supabase.rpc('release_expired_orders');
    const { data } = await supabase
      .from('orders')
      .select('*, order_items(product_name, variant_name, qty)')
      .order('created_at', { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function avancar(o: Order) {
    const info = STATUS_INFO[o.status];
    if (!info.proximo) return;
    if (info.proximo === 'postado') {
      const code = trackingDraft[o.id]?.trim();
      if (!code) {
        alert('Antes de marcar como postado, preencha o código de rastreio dos Correios.');
        return;
      }
      if (!confirm(`Marcar como POSTADO com rastreio ${code}?`)) return;
      const supabase = createClient();
      await supabase.from('orders').update({ status: 'postado', tracking_code: code }).eq('id', o.id);
    } else {
      if (!confirm(`${info.proximoLabel?.replace('Marcar como ', 'Confirmar: ')}?`)) return;
      const supabase = createClient();
      await supabase.from('orders').update({ status: info.proximo }).eq('id', o.id);
    }
    load();
  }

  async function cancelar(o: Order) {
    if (!confirm(`Cancelar o pedido de ${o.customer_name}? O estoque dos itens volta para a loja.`)) return;
    const supabase = createClient();
    await supabase.rpc('cancel_order', { p_order_id: o.id });
    load();
  }

  function whatsappLink(o: Order) {
    const numero = o.customer_whatsapp.replace(/\D/g, '');
    // 10-11 dígitos = DDD + número (sem DDI) -> adiciona o 55 do Brasil.
    // 12-13 dígitos = já veio com DDI. (Cuida do caso DDD 55, ex.: Santa Maria-RS)
    const completo = numero.length <= 11 ? '55' + numero : numero;
    const msg = (MSG_WHATSAPP[o.status] || 'Olá NOME!')
      .replace('NOME', o.customer_name.split(' ')[0])
      .replace('RASTREIO', o.tracking_code ? `Rastreio: ${o.tracking_code}` : '');
    return `https://wa.me/${completo}?text=${encodeURIComponent(msg)}`;
  }

  const visiveis = orders.filter((o) =>
    filtro === 'ativos'
      ? !['entregue', 'cancelado'].includes(o.status)
      : filtro === 'todos'
        ? true
        : o.status === filtro
  );

  return (
    <main className="mx-auto max-w-3xl px-4">
      <h1 className="mt-6 text-2xl font-bold text-brand-700">Pedidos</h1>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {[
          ['ativos', 'Para cuidar'],
          ['aguardando_pagamento', 'Aguardando'],
          ['entregue', 'Entregues'],
          ['cancelado', 'Cancelados'],
          ['todos', 'Todos'],
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFiltro(k)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
              filtro === k ? 'bg-brand-600 text-white' : 'bg-white text-stone-700 shadow-sm'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-12 text-center text-stone-400">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <div className="mt-12 rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🌸</p>
          <p className="mt-2 font-medium">Nenhum pedido por aqui.</p>
          <p className="text-sm text-stone-500">Quando alguém comprar, o pedido aparece nesta lista.</p>
        </div>
      ) : (
        <ul className="mt-2 space-y-3">
          {visiveis.map((o) => {
            const info = STATUS_INFO[o.status];
            return (
              <li key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{o.customer_name}</p>
                    <p className="text-xs text-stone-500">
                      {new Date(o.created_at).toLocaleDateString('pt-BR')} · {o.city}/{o.state}
                    </p>
                  </div>
                  <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${info.cor}`}>
                    {info.label}
                  </span>
                </div>

                <div className="mt-2 rounded-xl bg-brand-50 p-2 text-sm">
                  {o.order_items.map((i, idx) => (
                    <p key={idx}>
                      {i.qty}x {i.product_name}
                      {i.variant_name ? ` (${i.variant_name})` : ''}
                    </p>
                  ))}
                  <p className="mt-1 font-bold text-brand-700">{formatBRL(o.total_cents)}</p>
                </div>

                {info.proximo === 'postado' && (
                  <input
                    value={trackingDraft[o.id] ?? o.tracking_code ?? ''}
                    onChange={(e) => setTrackingDraft((d) => ({ ...d, [o.id]: e.target.value }))}
                    placeholder="Código de rastreio dos Correios"
                    className="mt-3 w-full rounded-xl border border-stone-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {info.proximo && (
                    <button
                      onClick={() => avancar(o)}
                      className="flex-1 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
                    >
                      {info.proximoLabel}
                    </button>
                  )}
                  <a
                    href={whatsappLink(o)}
                    target="_blank"
                    className="rounded-full bg-green-600 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    💬 Avisar
                  </a>
                  {!['entregue', 'cancelado'].includes(o.status) && (
                    <button
                      onClick={() => cancelar(o)}
                      className="rounded-full border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
