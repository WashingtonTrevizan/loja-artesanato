'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import type { Product, ProductVariant } from '@/lib/types';

export default function AddToCart({
  product,
  variants,
  firstImage,
}: {
  product: Product;
  variants: ProductVariant[];
  firstImage: string | null;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [selected, setSelected] = useState<ProductVariant | null>(null);
  const [added, setAdded] = useState(false);

  const hasVariants = !!product.variant_label && variants.length > 0;
  const prontaEntrega = product.product_type === 'pronta_entrega';

  const stockOk = hasVariants
    ? selected
      ? !prontaEntrega || selected.stock > 0
      : false
    : !prontaEntrega || product.stock > 0;

  const needsSelection = hasVariants && !selected;

  function handleAdd() {
    if (needsSelection || !stockOk) return;
    addItem({
      productId: product.id,
      variantId: selected?.id ?? null,
      name: product.name,
      variantName: selected?.name ?? null,
      priceCents: product.price_cents,
      imageUrl: selected?.image_url ?? firstImage,
      qty: 1,
      productType: product.product_type,
      maxStock: prontaEntrega ? (selected ? selected.stock : product.stock) : null,
    });
    setAdded(true);
    setTimeout(() => router.push('/carrinho'), 600);
  }

  return (
    <div className="mt-6">
      {hasVariants && (
        <>
          <p className="mb-2 text-sm font-medium text-stone-700">
            Escolha: {product.variant_label}
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => {
              const esgotada = prontaEntrega && v.stock === 0;
              return (
                <button
                  key={v.id}
                  disabled={esgotada}
                  onClick={() => setSelected(v)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    selected?.id === v.id
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : esgotada
                        ? 'border-stone-200 bg-stone-100 text-stone-400 line-through'
                        : 'border-stone-300 bg-white text-stone-700'
                  }`}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={handleAdd}
        disabled={needsSelection || !stockOk || added}
        className="mt-5 w-full rounded-full bg-brand-600 py-4 text-lg font-bold text-white shadow-md transition active:scale-95 disabled:bg-stone-300"
      >
        {added
          ? '✓ Adicionado!'
          : needsSelection
            ? `Escolha ${product.variant_label} acima`
            : !stockOk
              ? 'Esgotado'
              : 'Adicionar ao carrinho'}
      </button>
    </div>
  );
}
