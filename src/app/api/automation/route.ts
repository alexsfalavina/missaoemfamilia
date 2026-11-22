import { NextRequest, NextResponse } from 'next/server';
import {
  getAutomationSettings,
  getBrandProfile,
  getIntegrationStatus,
  listMediaAssets,
  listPosts,
  replaceWeeklyPosts,
  resetDemoData,
  updateAutomationSettings,
} from '@/lib/store/repository';
import { getGeminiMarketingService } from '@/lib/integrations/gemini';

export async function GET() {
  try {
    const [settings, integrationStatus] = await Promise.all([
      getAutomationSettings(),
      getIntegrationStatus(),
    ]);
    return NextResponse.json({ settings, integrationStatus });
  } catch (error) {
    console.error('Erro ao carregar configurações de automação:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar as configurações da automação semanal.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (body?.action === 'reset_demo') {
      await resetDemoData();
      const settings = await getAutomationSettings();
      return NextResponse.json({
        settings,
        message: 'Ambiente de demonstração restaurado com os 7 conteúdos iniciais.',
      });
    }

    if (body?.action === 'prepare_next_week') {
      const [brand, mediaLibrary, existing] = await Promise.all([
        getBrandProfile(),
        listMediaAssets(),
        listPosts(),
      ]);
      const gemini = getGeminiMarketingService();
      const nextWeekStart =
        typeof body.weekStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)
          ? body.weekStartDate
          : '2026-11-30';
      const generated = await gemini.generateWeeklyPlan({
        brand,
        weekStartDate: nextWeekStart,
        focusTheme: typeof body.focusTheme === 'string' ? body.focusTheme : '',
        mediaLibrary,
        existingTitles: existing.map((p) => p.title),
      });
      await replaceWeeklyPosts(generated);
      const settings = await getAutomationSettings();
      return NextResponse.json({
        settings,
        preparedCount: generated.length,
        message:
          'Lote dos próximos 7 dias preparado com equilíbrio estratégico e disponível para a revisão de sábado.',
      });
    }

    const updated = await updateAutomationSettings({
      enabled: Boolean(body.enabled),
      reviewDay: 'sabado',
      preparationDay: body.preparationDay === 'quinta' ? 'quinta' : 'sexta',
      preparationTime: String(body.preparationTime || '18:00'),
      readyTime: String(body.readyTime || '08:00'),
      postsPerWeek: Math.min(14, Math.max(1, Number(body.postsPerWeek || 7))),
      notificationChannel: body.notificationChannel || 'whatsapp',
      notificationRecipient: String(body.notificationRecipient ?? '').trim(),
      categoryMix: body.categoryMix,
      objectiveMix: body.objectiveMix,
    });

    return NextResponse.json({
      settings: updated,
      message: 'Configurações da preparação pré-sábado salvas com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de automação:', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar as configurações de automação.' },
      { status: 500 }
    );
  }
}
