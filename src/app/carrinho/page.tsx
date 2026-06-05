'use client';
import Header from '@/components/Header';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatBRL } from '@/lib/types';

export default function CartPage() {
  const { items, removeItem, setQty, totalCents } = useCart();
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_ARTESA;

  function checkoutWhatsApp() {
    const linhas = items.map(
      (i) =>
        `• ${i.qty}x ${i.name}${i.variantName ? ` (${i.variantName})` : ''} — ${formatBRL(
          i.priceCents * i.qty
        )}`
    );
    const msg = [
      'Olá! Quero fazer um pedido: 🧵',
      '',
      ...linhas,
      '',
      `Total dos produtos: ${formatBRL(totalCents)}`,
      '(+ frete a combinar)',
    ].join('\n');
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24">
        <h1 className="mt-6 text-2xl font-bold">Seu carrinho</h1>

        {items.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-stone-500">Seu carrinho está vazio.</p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-full bg-brand-600 px-6 py-3 font-medium text-white"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li
                  key={`${i.productId}-${i.variantId}`}
                  className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm"
                >
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-100">
                    {i.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={i.imageUrl} alt={i.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-2xl">🧵</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-medium">
                      {i.name}
                      {i.variantName && (
                        <span className="text-stone-500"> · {i.variantName}</span>
                      )}
                    </p>
                    {i.productType === 'sob_encomenda' && (
                      <span className="text-xs text-amber-700">Sob encomenda</span>
                    )}
                    <p className="mt-auto font-bold text-brand-600">
                      {formatBRL(i.priceCents * i.qty)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(i.productId, i.variantId)}
                      className="text-sm text-stone-400"
                      aria-label="Remover item"
                    >
                      ✕
                    </button>
                    <div className="flex items-center gap-2 rounded-full border border-stone-200 px-2 py-1">
                      <button
                        onClick={() => setQty(i.productId, i.variantId, i.qty - 1)}
                        className="px-1 text-lg"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm font-medium">{i.qty}</span>
                      <button
                        onClick={() => setQty(i.productId, i.variantId, i.qty + 1)}
                        className="px-1 text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-brand-600">{formatBRL(totalCents)}</span>
              </div>
              <p className="mt-1 text-xs text-stone-500">Frete combinado no WhatsApp.</p>
              <button
                onClick={checkoutWhatsApp}
                className="mt-4 w-full rounded-full bg-green-600 py-4 text-lg font-bold text-white shadow-md transition active:scale-95"
              >
                Finalizar pelo WhatsApp 💬
              </button>
              <p className="mt-2 text-center text-xs text-stone-400">
                Em breve: pagamento por Pix e cartão direto no site.
              </p>
            </div>
          </>
        )}
      </main>
    </>
  );
}
