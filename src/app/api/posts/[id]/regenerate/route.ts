import { NextRequest, NextResponse } from 'next/server';
import { regeneratePostById } from '@/lib/store/repository';
import type { ContentToneProfile } from '@/types/marketing';

const VALID_MODES = new Set(['completo', 'outro_tom', 'outro_visual']);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode || 'completo';

    if (!VALID_MODES.has(mode)) {
      return NextResponse.json(
        { error: 'Modo inválido. Use completo, outro_tom ou outro_visual.' },
        { status: 400 }
      );
    }

    const updated = await regeneratePostById({
      id,
      mode,
      requestedTone: body?.requestedTone as ContentToneProfile | undefined,
      visualInstruction:
        typeof body?.visualInstruction === 'string' ? body.visualInstruction : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
    }

    const messageMap: Record<string, string> = {
      completo: 'Publicação regenerada com nova abordagem editorial sem repetir temas da semana.',
      outro_tom: 'Tom da legenda e do gancho adaptado mantendo a credibilidade da marca.',
      outro_visual: 'Nova variação visual aplicada preservando a identidade roxa e verde.',
    };

    return NextResponse.json({
      post: updated,
      message: messageMap[mode],
    });
  } catch (error) {
    console.error('Erro ao regenerar publicação:', error);
    return NextResponse.json(
      { error: 'Não foi possível regenerar esta publicação.' },
      { status: 500 }
    );
  }
}
