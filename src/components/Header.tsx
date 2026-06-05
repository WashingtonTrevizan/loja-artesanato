'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';

export default function Header() {
  const { count } = useCart();
  const nome = process.env.NEXT_PUBLIC_NOME_LOJA || 'Minha Loja';
  return (
    <header className="sticky top-0 z-20 bg-brand-600 text-white shadow">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold tracking-tight">
          {nome}
        </Link>
        <Link
          href="/carrinho"
          className="relative rounded-full bg-brand-700 px-4 py-2 text-sm font-medium"
        >
          🛒 Carrinho
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-brand-700">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
