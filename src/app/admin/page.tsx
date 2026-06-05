'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Product } from '@/lib/types';
import { formatBRL } from '@/lib/types';

export default function AdminHome() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from('products')
      .select('*, product_images(*), product_variants(*)')
      .order('created_at', { ascending: false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleActive(p: Product) {
    const acao = p.active ? 'esconder da loja' : 'mostrar na loja';
    if (!confirm(`Quer ${acao} o produto "${p.name}"?`)) return;
    const supabase = createClient();
    await supabase.from('products').update({ active: !p.active }).eq('id', p.id);
    load();
  }

  function estoqueTexto(p: Product) {
    if (p.product_type === 'sob_encomenda') return '✨ Sob encomenda';
    if (p.variant_label && p.product_variants?.length) {
      const total = p.product_variants.reduce((s, v) => s + v.stock, 0);
      return total > 0 ? `${total} un. (somando variações)` : '⚠️ Esgotado';
    }
    return p.stock > 0 ? `${p.stock} un. em estoque` : '⚠️ Esgotado';
  }

  return (
    <main className="mx-auto max-w-3xl px-4">
      <h1 className="mt-6 text-2xl font-bold text-brand-700">Meus produtos</h1>
      <p className="text-sm text-stone-500">Toque em um produto para mudar qualquer coisa.</p>

      {loading ? (
        <p className="mt-12 text-center text-stone-400">Carregando...</p>
      ) : products.length === 0 ? (
        <div className="mt-12 rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-4xl">🧵</p>
          <p className="mt-2 font-medium">Você ainda não tem produtos.</p>
          <p className="text-sm text-stone-500">
            Toque no botão <strong>+ Novo produto</strong> aqui embaixo para começar!
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {products.map((p) => {
            const img = p.product_images?.sort((a, b) => a.position - b.position)[0];
            return (
              <li key={p.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <Link href={`/admin/produto/${p.id}`} className="flex flex-1 gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-brand-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xl">🧵</div>
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${!p.active ? 'text-stone-400 line-through' : ''}`}>
                      {p.name}
                    </p>
                    <p className="text-sm font-bold text-brand-600">{formatBRL(p.price_cents)}</p>
                    <p className="text-xs text-stone-500">{estoqueTexto(p)}</p>
                  </div>
                </Link>
                <button
                  onClick={() => toggleActive(p)}
                  className={`self-center rounded-full px-3 py-1.5 text-xs font-medium ${
                    p.active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'
                  }`}
                >
                  {p.active ? 'Na loja ✓' : 'Escondido'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
