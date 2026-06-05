import { createClient } from '@/lib/supabase/server';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import Link from 'next/link';
import type { Category, Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: { categoria?: string; busca?: string };
}) {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('position');

  let query = supabase
    .from('products')
    .select('*, categories!inner(*), product_images(*)')
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (searchParams.categoria) {
    query = query.eq('categories.slug', searchParams.categoria);
  }
  if (searchParams.busca) {
    query = query.ilike('name', `%${searchParams.busca}%`);
  }

  const { data: products } = await query;

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-16">
        {/* Busca */}
        <form className="mt-4 flex gap-2" action="/">
          {searchParams.categoria && (
            <input type="hidden" name="categoria" value={searchParams.categoria} />
          )}
          <input
            type="search"
            name="busca"
            defaultValue={searchParams.busca || ''}
            placeholder="Buscar produto..."
            className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button className="rounded-full bg-brand-600 px-5 py-2 text-sm font-medium text-white">
            Buscar
          </button>
        </form>

        {/* Categorias */}
        <nav className="mt-4 flex gap-2 overflow-x-auto pb-2">
          <CategoryChip label="Tudo" href="/" active={!searchParams.categoria} />
          {(categories as Category[] | null)?.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.name}
              href={`/?categoria=${c.slug}`}
              active={searchParams.categoria === c.slug}
            />
          ))}
        </nav>

        {/* Produtos */}
        {products && products.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {(products as Product[]).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <p className="mt-12 text-center text-stone-500">
            {searchParams.busca
              ? 'Nenhum produto encontrado para essa busca.'
              : 'Ainda não há produtos cadastrados por aqui. Volte logo! 🧵'}
          </p>
        )}
      </main>
    </>
  );
}

function CategoryChip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-stone-700 shadow-sm'
      }`}
    >
      {label}
    </Link>
  );
}
