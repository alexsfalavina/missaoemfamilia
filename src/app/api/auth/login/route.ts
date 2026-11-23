import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateWithCredentials,
  setSessionCookie,
} from '@/lib/auth/session';
import {
  checkLoginRateLimit,
  clearLoginRateLimitForAccount,
  extractClientIp,
  recordFailedLoginAttempt,
} from '@/lib/auth/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '');
    const password = String(body?.password ?? '');
    const clientIp = extractClientIp(request);

    const limitCheck = checkLoginRateLimit(clientIp, email);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error:
            'Muitas tentativas de login em pouco tempo. Aguarde alguns minutos antes de tentar novamente.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(limitCheck.retryAfterSeconds),
          },
        }
      );
    }

    const result = await authenticateWithCredentials(email, password);
    if (!result.ok) {
      recordFailedLoginAttempt(clientIp, email);
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    clearLoginRateLimitForAccount(clientIp, email);
    await setSessionCookie(result.user);

    return NextResponse.json({
      user: result.user,
      message: `Bem-vinda, ${result.user.name}!`,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Não foi possível realizar o login.' },
      { status: 500 }
    );
  }
}
