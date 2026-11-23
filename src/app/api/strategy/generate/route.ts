import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import {
  createNewWeeklyBatchWithPosts,
  getBrandProfile,
  listMediaAssets,
  listPosts,
} from '@/lib/store/repository';
import { getGeminiMarketingService } from '@/lib/integrations/gemini';
import { getNextMondayIso } from '@/lib/constants/labels';

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ roles: ['owner', 'editor'] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const weekStartDate =
      typeof body?.weekStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)
        ? body.weekStartDate
        : getNextMondayIso();
    const focusTheme = typeof body?.focusTheme === 'string' ? body.focusTheme.trim() : '';

    const [brand, mediaLibrary, existingPosts] = await Promise.all([
      getBrandProfile(),
      listMediaAssets(),
      listPosts({ includeAllBatches: true }),
    ]);
    const gemini = getGeminiMarketingService();
    const batchId = `batch-${weekStartDate}-${Date.now()}`;

    const generatedPosts = await gemini.generateWeeklyPlan({
      brand,
      batchId,
      weekStartDate,
      focusTheme,
      mediaLibrary,
      existingTitles: existingPosts.map((p) => p.title),
    });

    const { batch, posts: savedPosts } = await createNewWeeklyBatchWithPosts({
      weekStartDate,
      focusTheme,
      createdBy: auth.user.name,
      posts: generatedPosts,
    });

    return NextResponse.json({
      batch,
      posts: savedPosts,
      mode: gemini.getMode(),
      message:
        'Novo lote semanal gerado com 7 conteúdos prontos para revisão de sábado. O lote anterior foi preservado no histórico.',
    });
  } catch (error) {
    console.error('Erro ao gerar estratégia semanal:', error);
    return NextResponse.json(
      { error: 'Não foi possível gerar o planejamento semanal.' },
      { status: 500 }
    );
  }
}
