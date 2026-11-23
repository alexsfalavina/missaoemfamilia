import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import {
  getAnalyticsReport,
  getIntegrationStatus,
  listPosts,
} from '@/lib/store/repository';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const [analyticsData, integrationStatus, posts] = await Promise.all([
      getAnalyticsReport(),
      getIntegrationStatus(),
      listPosts({ includeAllBatches: true }),
    ]);
    return NextResponse.json({
      report: analyticsData.report,
      leads: analyticsData.leads,
      leadStats: analyticsData.leadStats,
      posts: posts.map((p) => ({
        id: p.id,
        title: `${p.title} (${p.weekLabel})`,
        dayOfWeek: p.dayOfWeek,
        format: p.format,
      })),
      integrationStatus,
    });
  } catch (error) {
    console.error('Erro ao carregar analytics:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar os relatórios de desempenho.' },
      { status: 500 }
    );
  }
}
