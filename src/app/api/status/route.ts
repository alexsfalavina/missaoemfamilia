import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import { getIntegrationStatus } from '@/lib/store/repository';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const status = await getIntegrationStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('Erro ao consultar status das integrações:', error);
    return NextResponse.json(
      { error: 'Não foi possível verificar o status das integrações.' },
      { status: 500 }
    );
  }
}
