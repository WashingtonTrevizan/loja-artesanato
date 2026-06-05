import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/cart';

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_NOME_LOJA || 'Loja de Artesanato',
  description: 'Artesanato em costura feito à mão: necessaires, bolsas e roupas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
