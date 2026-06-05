'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { CartItem } from './types';

const STORAGE_KEY = 'loja-carrinho-v1';

type CartContextType = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string, variantId: string | null) => void;
  setQty: (productId: string, variantId: string | null, qty: number) => void;
  clear: () => void;
  totalCents: number;
  count: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const sameLine = (a: CartItem, productId: string, variantId: string | null) =>
    a.productId === productId && a.variantId === variantId;

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      const existing = prev.find((i) => sameLine(i, item.productId, item.variantId));
      if (existing) {
        return prev.map((i) =>
          sameLine(i, item.productId, item.variantId)
            ? { ...i, qty: clampQty(i.qty + item.qty, i.maxStock) }
            : i
        );
      }
      return [...prev, { ...item, qty: clampQty(item.qty, item.maxStock) }];
    });
  };

  const removeItem = (productId: string, variantId: string | null) =>
    setItems((prev) => prev.filter((i) => !sameLine(i, productId, variantId)));

  const setQty = (productId: string, variantId: string | null, qty: number) =>
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => !sameLine(i, productId, variantId))
        : prev.map((i) =>
            sameLine(i, productId, variantId) ? { ...i, qty: clampQty(qty, i.maxStock) } : i
          )
    );

  const clear = () => setItems([]);
  const totalCents = items.reduce((s, i) => s + i.priceCents * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, setQty, clear, totalCents, count }}>
      {children}
    </CartContext.Provider>
  );
}

function clampQty(qty: number, maxStock: number | null) {
  if (maxStock === null) return Math.max(1, qty);
  return Math.max(1, Math.min(qty, maxStock));
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart precisa estar dentro de <CartProvider>');
  return ctx;
}
