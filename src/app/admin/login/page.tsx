'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('E-mail ou senha incorretos. Tente de novo, com calma. 💛');
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-md"
      >
        <h1 className="text-center text-2xl font-bold text-brand-700">Minha lojinha 🧵</h1>
        <p className="mt-1 text-center text-sm text-stone-500">
          Entre para cuidar dos seus produtos
        </p>

        <label className="mt-6 block text-sm font-medium">Seu e-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none"
          placeholder="exemplo@email.com"
        />

        <label className="mt-4 block text-sm font-medium">Sua senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-3 text-base focus:border-brand-500 focus:outline-none"
          placeholder="••••••••"
        />

        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <button
          disabled={loading}
          className="mt-6 w-full rounded-full bg-brand-600 py-4 text-lg font-bold text-white disabled:bg-stone-300"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}
