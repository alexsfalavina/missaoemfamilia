import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import {
  createNewWeeklyBatchWithPosts,
  getAutomationSettings,
  getBrandProfile,
  getIntegrationStatus,
  isDemoResetAllowed,
  listMediaAssets,
  listPosts,
  resetDemoData,
  updateAutomationSettings,
} from '@/lib/store/repository';
import { getGeminiMarketingService } from '@/lib/integrations/gemini';
import { addDaysIso, getNextMondayIso } from '@/lib/constants/labels';

export async function GET() {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

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
  const auth = await requireApiAuth({ roles: ['owner', 'editor'] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    if (body?.action === 'reset_demo') {
      if (auth.user.role !== 'owner') {
        return NextResponse.json(
          { error: 'Apenas a proprietária pode restaurar o lote inicial.' },
          { status: 403 }
        );
      }
      if (!isDemoResetAllowed()) {
        return NextResponse.json(
          {
            error:
              'Restauração de dados demonstrativos está desabilitada neste ambiente (bloqueada em produção e quando ALLOW_DEMO_SEED não está ativo).',
          },
          { status: 403 }
        );
      }
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
        listPosts({ includeAllBatches: true }),
      ]);
      const gemini = getGeminiMarketingService();
      const nextWeekStart =
        typeof body.weekStartDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStartDate)
          ? body.weekStartDate
          : addDaysIso(getNextMondayIso(), 7);
      const batchId = `batch-${nextWeekStart}-${Date.now()}`;
      const generated = await gemini.generateWeeklyPlan({
        brand,
        batchId,
        weekStartDate: nextWeekStart,
        focusTheme: typeof body.focusTheme === 'string' ? body.focusTheme : '',
        mediaLibrary,
        existingTitles: existing.map((p) => p.title),
      });
      const { batch } = await createNewWeeklyBatchWithPosts({
        weekStartDate: nextWeekStart,
        focusTheme: typeof body.focusTheme === 'string' ? body.focusTheme : undefined,
        createdBy: auth.user.name,
        posts: generated,
      });
      const settings = await getAutomationSettings();
      return NextResponse.json({
        settings,
        batch,
        preparedCount: generated.length,
        message:
          'Novo lote semanal preparado com equilíbrio estratégico e disponível para a revisão de sábado. O lote anterior foi arquivado no histórico.',
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
