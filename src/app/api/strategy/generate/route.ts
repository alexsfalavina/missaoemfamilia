import { NextRequest, NextResponse } from 'next/server';
import {
  getBrandProfile,
  listMediaAssets,
  listPosts,
  replaceWeeklyPosts,
} from '@/lib/store/repository';
import { getGeminiMarketingService } from '@/lib/integrations/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const weekStartDate =
      typeof body?.weekStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)
        ? body.weekStartDate
        : '2026-11-23';
    const focusTheme = typeof body?.focusTheme === 'string' ? body.focusTheme.trim() : '';

    const [brand, mediaLibrary, existingPosts] = await Promise.all([
      getBrandProfile(),
      listMediaAssets(),
      listPosts(),
    ]);
    const gemini = getGeminiMarketingService();

    const generatedPosts = await gemini.generateWeeklyPlan({
      brand,
      weekStartDate,
      focusTheme,
      mediaLibrary,
      existingTitles: existingPosts.map((p) => p.title),
    });

    const savedPosts = await replaceWeeklyPosts(generatedPosts);

    return NextResponse.json({
      posts: savedPosts,
      mode: gemini.getMode(),
      message:
        'Plano semanal equilibrado (Crescimento, Autoridade e Captação) gerado com 7 conteúdos prontos para revisão de sábado.',
    });
  } catch (error) {
    console.error('Erro ao gerar estratégia semanal:', error);
    return NextResponse.json(
      { error: 'Não foi possível gerar o planejamento semanal.' },
      { status: 500 }
    );
  }
}
