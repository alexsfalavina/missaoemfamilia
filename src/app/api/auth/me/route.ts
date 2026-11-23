import { NextResponse } from 'next/server';
import {
  getAuthProviderMode,
  LOCAL_DEV_DEFAULT_EMAIL,
  resolveLiveSessionUser,
} from '@/lib/auth/session';

export async function GET() {
  const { user } = await resolveLiveSessionUser();
  const authProvider = getAuthProviderMode();
  return NextResponse.json({
    authenticated: Boolean(user),
    user,
    authProvider,
    localDevHintEmail: authProvider === 'local_dev' ? LOCAL_DEV_DEFAULT_EMAIL : undefined,
  });
}
