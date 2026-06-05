'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

export default function CheckoutPage() {
  const { items, totalCents, clear } = useCart();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_whatsapp: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [cepLoading, setCepLoading] = useState(false);

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // busca endereço pelo CEP (ViaCEP, gratuito)
  async function onCepBlur() {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm((f) => ({
          ...f,
          street: d.logradouro || f.street,
          neighborhood: d.bairro || f.neighborhood,
          city: d.localidade || f.city,
          state: d.uf || f.state,
        }));
      }
    } catch {}
    setCepLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0) return;
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data, error: err } = await supabase.rpc('create_order', {
      p: {
        ...form,
        items: items.map((i) => ({
          product_id: i.productId,
          variant_id: i.variantId,
          qty: i.qty,
        })),
      },
    });
    if (err) {
      setError(
        err.message.includes('Estoque insuficiente')
          ? 'Ops — alguém comprou antes e o estoque acabou para um dos itens. Volte ao carrinho e ajuste.'
          : 'Não conseguimos fechar o pedido. Tente de novo. (' + err.message + ')'
      );
      setSaving(false);
      return;
    }
    clear();
    router.push(`/pedido/${data.access_code}`);
  }

  const inputCls =
    'mt-1 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-base focus:border-brand-500 focus:outline-none';

  if (items.length === 0 && !saving) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-xl px-4 pb-16 text-center">
          <p className="mt-12 text-stone-500">Seu carrinho está vazio.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-xl px-4 pb-24">
        <h1 className="mt-6 text-2xl font-bold">Finalizar pedido</h1>

        {/* resumo */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          {items.map((i) => (
            <div key={`${i.productId}-${i.variantId}`} className="flex justify-between py-1 text-sm">
              <span>
                {i.qty}x {i.name}
                {i.variantName ? ` (${i.variantName})` : ''}
              </span>
              <span className="font-medium">{formatBRL(i.priceCents * i.qty)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-stone-100 pt-2 font-bold">
            <span>Total dos produtos</span>
            <span className="text-brand-600">{formatBRL(totalCents)}</span>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Frete: combinado com você pelo WhatsApp após o pedido. Em breve, calculado aqui na hora.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">Seus dados</h2>
            <label className="mt-3 block text-sm font-medium">Nome completo</label>
            <input required value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} className={inputCls} />
            <label className="mt-3 block text-sm font-medium">E-mail</label>
            <input required type="email" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} className={inputCls} />
            <label className="mt-3 block text-sm font-medium">WhatsApp (com DDD)</label>
            <input required inputMode="tel" value={form.customer_whatsapp} onChange={(e) => set('customer_whatsapp', e.target.value)} className={inputCls} placeholder="11 99999-8888" />
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="font-bold">Endereço de entrega</h2>
            <label className="mt-3 block text-sm font-medium">CEP {cepLoading && '⏳'}</label>
            <input required inputMode="numeric" value={form.cep} onChange={(e) => set('cep', e.target.value)} onBlur={onCepBlur} className={inputCls} placeholder="00000-000" />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="mt-3 block text-sm font-medium">Rua</label>
                <input required value={form.street} onChange={(e) => set('street', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mt-3 block text-sm font-medium">Número</label>
                <input required value={form.number} onChange={(e) => set('number', e.target.value)} className={inputCls} />
              </div>
            </div>
            <label className="mt-3 block text-sm font-medium">Complemento (opcional)</label>
            <input value={form.complement} onChange={(e) => set('complement', e.target.value)} className={inputCls} />
            <label className="mt-3 block text-sm font-medium">Bairro</label>
            <input required value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} className={inputCls} />
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="mt-3 block text-sm font-medium">Cidade</label>
                <input required value={form.city} onChange={(e) => set('city', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mt-3 block text-sm font-medium">UF</label>
                <input required maxLength={2} value={form.state} onChange={(e) => set('state', e.target.value.toUpperCase())} className={inputCls} />
              </div>
            </div>
          </section>

          {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <button
            disabled={saving}
            className="w-full rounded-full bg-brand-600 py-4 text-lg font-bold text-white shadow-md disabled:bg-stone-300"
          >
            {saving ? 'Enviando pedido...' : 'Confirmar pedido'}
          </button>
          <p className="text-center text-xs text-stone-400">
            Reservamos seus itens por 30 minutos enquanto o pagamento é combinado.
          </p>
        </form>
      </main>
    </>
  );
}
