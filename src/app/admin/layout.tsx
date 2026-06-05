import AdminNav from '@/components/admin/AdminNav';

export const metadata = { title: 'Painel da Loja' };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-brand-50 pb-24">{children}<AdminNav /></div>;
}
