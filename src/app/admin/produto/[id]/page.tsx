import ProductForm from '@/components/admin/ProductForm';

export default function EditarProdutoPage({ params }: { params: { id: string } }) {
  return <ProductForm productId={params.id} />;
}
