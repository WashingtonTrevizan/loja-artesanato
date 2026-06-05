'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/admin/login') return null;

  async function sair() {
    if (!confirm('Quer mesmo sair do painel?')) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-around py-2">
        <Link href="/admin" className="flex flex-col items-center px-4 py-1 text-xs font-medium text-stone-600">
          <span className="text-xl">📦</span>
          Produtos
        </Link>
        <Link href="/admin/pedidos" className="flex flex-col items-center px-4 py-1 text-xs font-medium text-stone-600">
          <span className="text-xl">📋</span>
          Pedidos
        </Link>
        <Link
          href="/admin/produto/novo"
          className="flex flex-col items-center rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-lg"
        >
          + Novo produto
        </Link>
        <Link href="/" className="flex flex-col items-center px-4 py-1 text-xs font-medium text-stone-600">
          <span className="text-xl">🏪</span>
          Ver loja
        </Link>
        <button onClick={sair} className="flex flex-col items-center px-4 py-1 text-xs font-medium text-stone-600">
          <span className="text-xl">🚪</span>
          Sair
        </button>
      </div>
    </nav>
  );
}
