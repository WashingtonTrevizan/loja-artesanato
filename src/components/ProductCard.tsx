import Link from 'next/link';
import type { Product } from '@/lib/types';
import { formatBRL } from '@/lib/types';

export default function ProductCard({ product }: { product: Product }) {
  const img = product.product_images?.sort((a, b) => a.position - b.position)[0];
  const semEstoque =
    product.product_type === 'pronta_entrega' &&
    !product.variant_label &&
    product.stock === 0;

  return (
    <Link
      href={`/produto/${product.id}`}
      className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square bg-brand-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img.url}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🧵</div>
        )}
        {product.product_type === 'sob_encomenda' && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-900">
            Sob encomenda
          </span>
        )}
        {semEstoque && (
          <span className="absolute left-2 top-2 rounded-full bg-stone-700 px-2 py-0.5 text-xs font-semibold text-white">
            Esgotado
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        <p className="mt-1 font-bold text-brand-600">{formatBRL(product.price_cents)}</p>
      </div>
    </Link>
  );
}
