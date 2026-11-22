import { NextRequest, NextResponse } from 'next/server';
import {
  getAutomationSettings,
  getIntegrationStatus,
  resetDemoData,
  updateAutomationSettings,
} from '@/lib/store/repository';

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

    const updated = await updateAutomationSettings({
      enabled: Boolean(body.enabled),
      reviewDay: body.reviewDay || 'sabado',
      readyTime: String(body.readyTime || '08:00'),
      postsPerWeek: Math.min(14, Math.max(1, Number(body.postsPerWeek || 7))),
      notificationChannel: body.notificationChannel || 'whatsapp',
      notificationRecipient: String(body.notificationRecipient ?? '').trim(),
      categoryMix: body.categoryMix,
    });

    return NextResponse.json({
      settings: updated,
      message: 'Configurações da rotina de sábado salvas com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao salvar configurações de automação:', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar as configurações de automação.' },
      { status: 500 }
    );
  }
}
