export type Category = {
  id: string;
  name: string;
  slug: string;
  default_weight_grams: number;
  default_length_cm: number;
  default_width_cm: number;
  default_height_cm: number;
  position: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  stock: number;
  image_url: string | null;
  position: number;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  position: number;
};

export type Product = {
  id: string;
  created_at: string;
  name: string;
  description: string;
  price_cents: number;
  category_id: string;
  product_type: 'pronta_entrega' | 'sob_encomenda';
  production_days: number | null;
  stock: number;
  weight_grams: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  variant_label: string | null;
  active: boolean;
  categories?: Category;
  product_variants?: ProductVariant[];
  product_images?: ProductImage[];
};

export type CartItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  priceCents: number;
  imageUrl: string | null;
  qty: number;
  productType: 'pronta_entrega' | 'sob_encomenda';
  maxStock: number | null; // null = sob encomenda (sem limite de estoque)
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
