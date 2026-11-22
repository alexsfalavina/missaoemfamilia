export interface SupabaseServerConfig {
  url: string | null;
  hasServiceRoleKey: boolean;
  configured: boolean;
}

/**
 * Lê variáveis do Supabase exclusivamente no lado do servidor.
 * Nunca expõe chaves ao navegador.
 */
export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.SUPABASE_URL?.trim() || null;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;

  return {
    url,
    hasServiceRoleKey: Boolean(serviceRoleKey),
    configured: Boolean(url && serviceRoleKey),
  };
}
