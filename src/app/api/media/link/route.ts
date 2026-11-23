import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import {
  linkMediaToTarget,
  unlinkMediaFromTarget,
} from '@/lib/store/repository';

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ roles: ['owner', 'editor'] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const mediaAssetId = String(body?.mediaAssetId ?? '').trim();
    const batchId = body?.batchId ? String(body.batchId).trim() : undefined;
    const postId = body?.postId ? String(body.postId).trim() : undefined;

    if (!mediaAssetId || (!batchId && !postId)) {
      return NextResponse.json(
        { error: 'Informe a mídia e o lote ou conteúdo de destino para associar.' },
        { status: 400 }
      );
    }

    const result = await linkMediaToTarget({ mediaAssetId, batchId, postId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      asset: result.asset,
      message: 'Mídia associada com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao associar mídia:', error);
    return NextResponse.json(
      { error: 'Não foi possível associar a mídia.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth({ roles: ['owner', 'editor'] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const mediaAssetId = String(body?.mediaAssetId ?? '').trim();
    const batchId = body?.batchId ? String(body.batchId).trim() : undefined;
    const postId = body?.postId ? String(body.postId).trim() : undefined;

    if (!mediaAssetId || (!batchId && !postId)) {
      return NextResponse.json(
        { error: 'Informe a mídia e o vínculo a remover.' },
        { status: 400 }
      );
    }

    const result = await unlinkMediaFromTarget({ mediaAssetId, batchId, postId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      asset: result.asset,
      message: 'Associação removida.',
    });
  } catch (error) {
    console.error('Erro ao remover associação de mídia:', error);
    return NextResponse.json(
      { error: 'Não foi possível remover a associação.' },
      { status: 500 }
    );
  }
}
