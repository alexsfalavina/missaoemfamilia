import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import {
  getBrandProfile,
  getDashboardMetrics,
  getIntegrationStatus,
  listPosts,
  listWeeklyBatches,
} from '@/lib/store/repository';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const [metrics, posts, brand, status, batches] = await Promise.all([
      getDashboardMetrics(),
      listPosts(),
      getBrandProfile(),
      getIntegrationStatus(),
      listWeeklyBatches(),
    ]);

    return NextResponse.json({
      metrics,
      posts,
      batches,
      brand,
      integrationStatus: status,
      currentUser: auth.user,
    });
  } catch (error) {
    console.error('Erro ao carregar painel:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar os dados do painel.' },
      { status: 500 }
    );
  }
}
