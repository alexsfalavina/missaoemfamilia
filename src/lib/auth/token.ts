import type { AuthUser } from '@/types/marketing';

export const SESSION_COOKIE_NAME = 'jessica_ai_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 dias

interface SessionPayload {
  user: AuthUser;
  exp: number; // unix seconds
}

function readEnv(name: string): string | null {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getSessionSecret(): string | null {
  const envSecret = readEnv('AUTH_SESSION_SECRET');
  const hasSupabaseUrl = Boolean(readEnv('SUPABASE_URL') || readEnv('NEXT_PUBLIC_SUPABASE_URL'));
  const hasSupabaseKey = Boolean(
    readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
      readEnv('SUPABASE_PUBLISHABLE_KEY') ||
      readEnv('SUPABASE_SECRET_KEY')
  );
  const isStrictMode = process.env.NODE_ENV === 'production' || (hasSupabaseUrl && hasSupabaseKey);

  if (isStrictMode) {
    return envSecret && envSecret.length >= 32 ? envSecret : null;
  }

  if (envSecret && envSecret.length >= 16) return envSecret;

  // Fallback exclusivo para desenvolvimento local (NODE_ENV !== 'production' e sem Supabase)
  return 'dev-local-only-ephemeral-session-secret-not-for-production';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padLen));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function importHmacKey(): Promise<CryptoKey | null> {
  const secret = getSessionSecret();
  if (!secret) return null;
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signSessionToken(user: AuthUser): Promise<string> {
  const key = await importHmacKey();
  if (!key) {
    throw new Error(
      'Segredo de sessão ausente no servidor. Configure AUTH_SESSION_SECRET (mínimo 32 caracteres).'
    );
  }

  const payload: SessionPayload = {
    user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sigBuf = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(encodedPayload)
  );
  const encodedSig = toBase64Url(new Uint8Array(sigBuf));
  return `${encodedPayload}.${encodedSig}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token || !token.includes('.')) return null;
  const [encodedPayload, encodedSig] = token.split('.');
  if (!encodedPayload || !encodedSig) return null;

  try {
    const key = await importHmacKey();
    if (!key) return null;

    const sigBytes = fromBase64Url(encodedSig);
    const sigCopy = new Uint8Array(sigBytes.length);
    sigCopy.set(sigBytes);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigCopy.buffer,
      new TextEncoder().encode(encodedPayload)
    );
    if (!valid) return null;

    const jsonStr = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const payload = JSON.parse(jsonStr) as SessionPayload;
    if (!payload?.user?.id || !payload?.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload.user;
  } catch {
    return null;
  }
}
