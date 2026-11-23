import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import { listPosts, listWeeklyBatches } from '@/lib/store/repository';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const [batches, allPosts] = await Promise.all([
      listWeeklyBatches(),
      listPosts({ includeAllBatches: true }),
    ]);

    const enriched = batches.map((batch) => {
      const batchPosts = allPosts.filter((p) => p.batchId === batch.id);
      return {
        ...batch,
        postsCount: batchPosts.length,
        approvedCount: batchPosts.filter((p) => p.status === 'aprovado').length,
        pendingCount: batchPosts.filter((p) => p.status === 'aguardando_aprovacao').length,
      };
    });

    return NextResponse.json({ batches: enriched });
  } catch (error) {
    console.error('Erro ao listar histórico de lotes:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar o histórico de lotes semanais.' },
      { status: 500 }
    );
  }
}
