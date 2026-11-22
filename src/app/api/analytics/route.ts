import { NextResponse } from 'next/server';
import {
  getAnalyticsReport,
  getIntegrationStatus,
  listPosts,
} from '@/lib/store/repository';

export async function GET() {
  try {
    const [analyticsData, integrationStatus, posts] = await Promise.all([
      getAnalyticsReport(),
      getIntegrationStatus(),
      listPosts(),
    ]);
    return NextResponse.json({
      report: analyticsData.report,
      leads: analyticsData.leads,
      leadStats: analyticsData.leadStats,
      posts: posts.map((p) => ({
        id: p.id,
        title: p.title,
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
