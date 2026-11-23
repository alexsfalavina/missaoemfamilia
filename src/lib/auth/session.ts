import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { AuthUser, UserRole } from '@/types/marketing';
import {
  createSupabaseAuthClient,
  createSupabaseUserClient,
  getSupabaseAdminClient,
  getSupabaseServerConfig,
} from '@/lib/supabase/client';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  signSessionToken,
  verifySessionToken,
} from '@/lib/auth/token';

export const LOCAL_DEV_DEFAULT_EMAIL = 'jessica@missaoemfamilia.com';

export function getAuthProviderMode(): 'supabase' | 'local_dev' {
  return getSupabaseServerConfig().authConfigured ? 'supabase' : 'local_dev';
}

export async function getSessionUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function setSessionCookie(user: AuthUser): Promise<void> {
  const token = await signSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function authenticateWithCredentials(
  emailInput: string,
  passwordInput: string
): Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }> {
  const email = emailInput.trim().toLowerCase();
  const password = passwordInput;

  if (!email || !password) {
    return { ok: false, error: 'Informe seu e-mail e senha.' };
  }

  const supabaseCfg = getSupabaseServerConfig();

  // Modo 1: Supabase Auth real usando NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY + RLS (sem usar a secret key no login)
  if (supabaseCfg.authConfigured) {
    const authClient = createSupabaseAuthClient();
    if (!authClient) {
      return { ok: false, error: 'Configuração de autenticação do Supabase incompleta.' };
    }

    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session?.access_token) {
      return { ok: false, error: 'E-mail ou senha inválidos.' };
    }

    // Consulta o próprio perfil usando o JWT do usuário sob a política RLS "members_read_own_profile"
    const userClient = createSupabaseUserClient(data.session.access_token);
    if (!userClient) {
      return { ok: false, error: 'Não foi possível validar o perfil do usuário autenticado.' };
    }

    const { data: profile, error: profErr } = await userClient
      .from('user_profiles')
      .select('id, email, full_name, role, active')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profErr || !profile || !profile.active) {
      return {
        ok: false,
        error:
          'Sua conta não está autorizada nesta plataforma. Solicite liberação em user_profiles no Supabase.',
      };
    }

    return {
      ok: true,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: (profile.role as UserRole) || 'viewer',
        authProvider: 'supabase',
      },
    };
  }

  // Modo 2: Desenvolvimento local sem Supabase — exige AUTH_ADMIN_PASSWORD no servidor (sem senha fixa no código)
  const expectedEmail = (
    process.env.AUTH_ADMIN_EMAIL?.trim() || LOCAL_DEV_DEFAULT_EMAIL
  ).toLowerCase();
  const expectedPassword = process.env.AUTH_ADMIN_PASSWORD?.trim();

  if (!expectedPassword) {
    return {
      ok: false,
      error:
        'Autenticação ainda não configurada neste servidor. Configure o Supabase Auth ou a senha local de desenvolvimento no servidor.',
    };
  }

  if (email === expectedEmail && password === expectedPassword) {
    return {
      ok: true,
      user: {
        id: 'local-owner-jessica',
        email: expectedEmail,
        name: 'Jessica Nalin',
        role: 'owner',
        authProvider: 'local_dev',
      },
    };
  }

  if (email === 'editora@missaoemfamilia.com' && password === expectedPassword) {
    return {
      ok: true,
      user: {
        id: 'local-editor-equipe',
        email: 'editora@missaoemfamilia.com',
        name: 'Equipe (Editora)',
        role: 'editor',
        authProvider: 'local_dev',
      },
    };
  }

  if (email === 'equipe@missaoemfamilia.com' && password === expectedPassword) {
    return {
      ok: true,
      user: {
        id: 'local-viewer-equipe',
        email: 'equipe@missaoemfamilia.com',
        name: 'Equipe (Visualização)',
        role: 'viewer',
        authProvider: 'local_dev',
      },
    };
  }

  return { ok: false, error: 'E-mail ou senha inválidos.' };
}

export async function resolveLiveSessionUser(): Promise<{
  user: AuthUser | null;
  revokedReason?: string;
}> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { user: null };
  }

  let effectiveUser: AuthUser = sessionUser;
  const supabaseCfg = getSupabaseServerConfig();

  // Impede que um cookie local_dev seja reutilizado quando o Supabase Auth estiver ativo
  if (supabaseCfg.authConfigured && sessionUser.authProvider !== 'supabase') {
    return {
      user: null,
      revokedReason: 'Sessão inválida para o provedor de autenticação ativo. Faça login novamente.',
    };
  }

  // Revalida status ativo e perfil atual em user_profiles antes de qualquer operação
  if (supabaseCfg.configured && sessionUser.authProvider === 'supabase') {
    const adminClient = getSupabaseAdminClient();
    if (adminClient) {
      const { data: profile, error } = await adminClient
        .from('user_profiles')
        .select('id, email, full_name, role, active')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (error || !profile || !profile.active) {
        return {
          user: null,
          revokedReason: 'Acesso revogado ou perfil inativo. Contate a proprietária da plataforma.',
        };
      }

      effectiveUser = {
        ...sessionUser,
        email: String(profile.email),
        name: String(profile.full_name),
        role: (profile.role as UserRole) || 'viewer',
      };
    }
  }

  return { user: effectiveUser };
}

export async function requireApiAuth(options?: {
  roles?: UserRole[];
}): Promise<
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse }
> {
  const { user: effectiveUser, revokedReason } = await resolveLiveSessionUser();
  if (!effectiveUser) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            revokedReason ||
            'Sessão expirada ou não autenticada. Faça login para continuar.',
        },
        { status: 401 }
      ),
    };
  }

  if (options?.roles && options.roles.length > 0 && !options.roles.includes(effectiveUser.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Permissão insuficiente. Apenas proprietários ou editores podem realizar esta ação.',
        },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user: effectiveUser };
}
