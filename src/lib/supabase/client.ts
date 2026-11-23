import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseServerConfig {
  url: string | null;
  hasPublishableKey: boolean;
  hasSecretKey: boolean;
  storageBucket: string;
  configured: boolean;
  authConfigured: boolean;
}

function assertServerOnly(context: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(`Acesso bloqueado: ${context} só pode ser executado no servidor.`);
  }
}

function readServerEnv(name: string): string | null {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resolveSupabaseUrl(): string | null {
  return readServerEnv('SUPABASE_URL') || readServerEnv('NEXT_PUBLIC_SUPABASE_URL');
}

function resolvePublishableKey(): string | null {
  return (
    readServerEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    readServerEnv('SUPABASE_PUBLISHABLE_KEY')
  );
}

function resolveSecretKey(): string | null {
  return readServerEnv('SUPABASE_SECRET_KEY');
}

function isValidPublishableKey(key: string | null): key is string {
  return Boolean(key && key.length >= 20 && !key.startsWith('sb_secret_'));
}

function isValidSecretKey(key: string | null): key is string {
  return Boolean(key && key.length >= 20 && !key.startsWith('sb_publishable_'));
}

/**
 * Lê variáveis do Supabase exclusivamente no lado do servidor.
 * Compatível com as variáveis oficiais atuais do Supabase:
 * - SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_...)
 * - SUPABASE_SECRET_KEY (sb_secret_..., exclusivamente servidor)
 */
export function getSupabaseServerConfig(): SupabaseServerConfig {
  assertServerOnly('getSupabaseServerConfig');
  const url = resolveSupabaseUrl();
  const publishableKey = resolvePublishableKey();
  const secretKey = resolveSecretKey();
  const storageBucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'jessica-media';

  const hasPublishableKey = isValidPublishableKey(publishableKey);
  const hasSecretKey = isValidSecretKey(secretKey);

  return {
    url,
    hasPublishableKey,
    hasSecretKey,
    storageBucket,
    configured: Boolean(url && hasSecretKey),
    authConfigured: Boolean(url && hasPublishableKey),
  };
}

let cachedAdminClient: SupabaseClient | null = null;
let cachedAdminKeyFingerprint = '';

/**
 * Cliente administrativo (SUPABASE_SECRET_KEY) exclusivamente server-side.
 * Usado somente após validação de sessão e permissões (RBAC) nas rotas de API
 * para operações administrativas de banco e geração de URLs assinadas no Storage.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  assertServerOnly('getSupabaseAdminClient');
  const url = resolveSupabaseUrl();
  const secretKey = resolveSecretKey();
  if (!url || !isValidSecretKey(secretKey)) return null;

  const fingerprint = `${url}::${secretKey.slice(0, 18)}::${secretKey.length}`;
  if (!cachedAdminClient || cachedAdminKeyFingerprint !== fingerprint) {
    cachedAdminClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedAdminKeyFingerprint = fingerprint;
  }
  return cachedAdminClient;
}

/**
 * Cliente dedicado para autenticação (signInWithPassword) com NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
 * Não utiliza a chave secreta.
 */
export function createSupabaseAuthClient(): SupabaseClient | null {
  assertServerOnly('createSupabaseAuthClient');
  const url = resolveSupabaseUrl();
  const publishableKey = resolvePublishableKey();
  if (!url || !isValidPublishableKey(publishableKey)) return null;

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Cliente autenticado no contexto de um usuário real (JWT do Supabase Auth)
 * usando NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, sujeito integralmente às políticas RLS do banco.
 */
export function createSupabaseUserClient(accessToken: string): SupabaseClient | null {
  assertServerOnly('createSupabaseUserClient');
  const url = resolveSupabaseUrl();
  const publishableKey = resolvePublishableKey();
  if (!url || !isValidPublishableKey(publishableKey) || !accessToken.trim()) return null;

  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
