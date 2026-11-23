import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedBrowserClient: SupabaseClient | null = null;

/**
 * Cliente Supabase seguro para navegador (somente chave pública sb_publishable_...).
 * NUNCA acessa nem referencia SUPABASE_SECRET_KEY.
 * Todas as operações realizadas com este cliente ficam integralmente sujeitas ao RLS.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';

  if (!url || !publishableKey || publishableKey.startsWith('sb_secret_')) {
    return null;
  }

  if (!cachedBrowserClient) {
    cachedBrowserClient = createClient(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedBrowserClient;
}
