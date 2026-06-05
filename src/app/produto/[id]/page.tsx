import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import AddToCart from '@/components/AddToCart';
import { notFound } from 'next/navigation';
import type { Product } from '@/lib/types';
import { formatBRL } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase
    .from('products')
    .select('*, categories(*), product_images(*), product_variants(*)')
    .eq('id', params.id)
    .eq('active', true)
    .single();

  if (!data) notFound();
  const product = data as Product;
  const images = (product.product_images || []).sort((a, b) => a.position - b.position);
  const variants = (product.product_variants || []).sort((a, b) => a.position - b.position);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24">
        {/* Fotos */}
        <div className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl">
          {images.length > 0 ? (
            images.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={img.id}
                src={img.url}
                alt={product.name}
                className="aspect-square w-full shrink-0 snap-center rounded-2xl bg-brand-100 object-cover sm:w-96"
              />
            ))
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-2xl bg-brand-100 text-6xl">
              🧵
            </div>
          )}
        </div>

        <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
        <p className="mt-1 text-3xl font-bold text-brand-600">{formatBRL(product.price_cents)}</p>

        {product.product_type === 'sob_encomenda' ? (
          <p className="mt-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900">
            ✨ Feito sob encomenda — fica pronto em até {product.production_days ?? '?'} dia(s)
            úteis + prazo de envio
          </p>
        ) : (
          !product.variant_label && (
            <p className="mt-2 text-sm text-stone-500">
              {product.stock > 0 ? `${product.stock} em estoque, pronta entrega` : 'Esgotado no momento'}
            </p>
          )
        )}

        {product.description && (
          <p className="mt-4 whitespace-pre-line leading-relaxed text-stone-700">
            {product.description}
          </p>
        )}

        <AddToCart product={product} variants={variants} firstImage={images[0]?.url ?? null} />
      </main>
    </>
  );
}
