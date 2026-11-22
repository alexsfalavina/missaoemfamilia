import { NextResponse } from 'next/server';
import {
  getBrandProfile,
  getDashboardMetrics,
  getIntegrationStatus,
  listPosts,
} from '@/lib/store/repository';

export async function GET() {
  try {
    const [metrics, posts, brand, status] = await Promise.all([
      getDashboardMetrics(),
      listPosts(),
      getBrandProfile(),
      getIntegrationStatus(),
    ]);

    return NextResponse.json({
      metrics,
      posts,
      brand,
      integrationStatus: status,
    });
  } catch (error) {
    console.error('Erro ao carregar painel:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar os dados do painel.' },
      { status: 500 }
    );
  }
}
