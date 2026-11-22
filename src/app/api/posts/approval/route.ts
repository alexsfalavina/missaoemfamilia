import { NextRequest, NextResponse } from 'next/server';
import {
  applyApprovalDecision,
  approveEntireWeeklyBatch,
} from '@/lib/store/repository';

const VALID_ACTIONS = new Set([
  'APROVAR',
  'APROVAR_LOTE_SEMANAL',
  'SOLICITAR_ALTERACOES',
  'REJEITAR',
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (!VALID_ACTIONS.has(action)) {
      return NextResponse.json(
        {
          error:
            'Ação de aprovação inválida. Use APROVAR, APROVAR_LOTE_SEMANAL, SOLICITAR_ALTERACOES ou REJEITAR.',
        },
        { status: 400 }
      );
    }

    if (action === 'APROVAR_LOTE_SEMANAL') {
      const updated = await approveEntireWeeklyBatch(body?.actor || 'Jessica Nalin');
      if (updated.length === 0) {
        return NextResponse.json({
          updated: [],
          count: 0,
          message: 'Todos os conteúdos ativos desta semana já estão aprovados.',
        });
      }
      return NextResponse.json({
        updated,
        count: updated.length,
        message: `Lote semanal aprovado (${updated.length} publicações organizadas localmente no Calendário Editorial — sem publicação automática no Instagram).`,
      });
    }

    const postIds = Array.isArray(body?.postIds)
      ? body.postIds.filter(
          (id: unknown): id is string => typeof id === 'string' && id.trim().length > 0
        )
      : typeof body?.postId === 'string'
        ? [body.postId]
        : [];

    if (postIds.length === 0) {
      return NextResponse.json(
        { error: 'Selecione ao menos uma publicação para realizar esta ação.' },
        { status: 400 }
      );
    }

    if (action === 'SOLICITAR_ALTERACOES' && (!body?.feedback || !String(body.feedback).trim())) {
      return NextResponse.json(
        { error: 'Descreva brevemente qual alteração você deseja solicitar.' },
        { status: 400 }
      );
    }

    const updated = await applyApprovalDecision({
      postIds,
      action,
      feedback: body?.feedback,
      actor: body?.actor || 'Jessica Nalin',
    });

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma publicação correspondente foi encontrada.' },
        { status: 404 }
      );
    }

    const messageMap: Record<string, string> = {
      APROVAR:
        updated.length === 1
          ? 'Publicação aprovada e organizada localmente no Calendário Editorial (sem publicação automática no Instagram).'
          : `${updated.length} publicações aprovadas e organizadas localmente no Calendário Editorial.`,
      SOLICITAR_ALTERACOES: 'Solicitação de alteração registrada para revisão do conteúdo.',
      REJEITAR: 'Publicação marcada como rejeitada e removida da fila de agendamento.',
    };

    return NextResponse.json({
      updated,
      count: updated.length,
      message: messageMap[action],
    });
  } catch (error) {
    console.error('Erro ao registrar decisão de aprovação:', error);
    return NextResponse.json(
      { error: 'Não foi possível registrar sua decisão.' },
      { status: 500 }
    );
  }
}
