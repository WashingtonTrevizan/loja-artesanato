// Cliente ADMIN (service role) — USO EXCLUSIVO NO SERVIDOR (API routes).
// Ignora RLS; nunca importe em componentes/páginas do navegador.
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
