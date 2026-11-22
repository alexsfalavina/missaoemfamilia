import { NextResponse } from 'next/server';
import { getAnalyticsReport, getIntegrationStatus } from '@/lib/store/repository';

export async function GET() {
  try {
    const [report, integrationStatus] = await Promise.all([
      getAnalyticsReport(),
      getIntegrationStatus(),
    ]);
    return NextResponse.json({ report, integrationStatus });
  } catch (error) {
    console.error('Erro ao carregar analytics:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar os relatórios de desempenho.' },
      { status: 500 }
    );
  }
}
