import { NextRequest, NextResponse } from 'next/server';
import {
  deletePost,
  getPostById,
  updatePost,
  updateReelsProductionById,
} from '@/lib/store/repository';
import { FORMAT_META } from '@/lib/constants/labels';
import type { ContentFormat } from '@/types/marketing';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ post });
  } catch (error) {
    console.error('Erro ao buscar publicação:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar a publicação.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (body?.reelsProduction) {
      const updatedReels = await updateReelsProductionById(
        id,
        body.reelsProduction,
        Boolean(body.sendReelsToApproval)
      );
      if (!updatedReels) {
        return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
      }
      return NextResponse.json({
        post: updatedReels,
        message: body.sendReelsToApproval
          ? 'Vídeo finalizado e salvo para aprovação humana na Central de Aprovação.'
          : 'Fluxo de produção do Reel atualizado.',
      });
    }

    const format = body.format as ContentFormat | undefined;
    const aspectRatio =
      body.aspectRatio ??
      (format && FORMAT_META[format] ? FORMAT_META[format].aspectRatio : undefined);

    const updated = await updatePost(
      id,
      {
        ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.strategicObjective !== undefined
          ? { strategicObjective: body.strategicObjective }
          : {}),
        ...(body.toneProfile !== undefined ? { toneProfile: body.toneProfile } : {}),
        ...(format !== undefined ? { format } : {}),
        ...(aspectRatio !== undefined ? { aspectRatio } : {}),
        ...(body.definedAudience !== undefined
          ? { definedAudience: String(body.definedAudience).trim() }
          : {}),
        ...(body.openingHook !== undefined
          ? { openingHook: String(body.openingHook).trim() }
          : {}),
        ...(body.educationalValue !== undefined
          ? { educationalValue: String(body.educationalValue).trim() }
          : {}),
        ...(body.marketingObjective !== undefined
          ? { marketingObjective: String(body.marketingObjective).trim() }
          : {}),
        ...(body.conversionFocus !== undefined
          ? { conversionFocus: String(body.conversionFocus).trim() }
          : {}),
        ...(body.serviceConnection !== undefined
          ? { serviceConnection: String(body.serviceConnection).trim() || undefined }
          : {}),
        ...(body.storyExecutionMode !== undefined
          ? { storyExecutionMode: body.storyExecutionMode }
          : {}),
        ...(body.storyManualInstructions !== undefined
          ? { storyManualInstructions: String(body.storyManualInstructions).trim() || undefined }
          : {}),
        ...(body.caption !== undefined ? { caption: String(body.caption) } : {}),
        ...(Array.isArray(body.hashtags) ? { hashtags: body.hashtags } : {}),
        ...(body.cta !== undefined ? { cta: String(body.cta).trim() } : {}),
        ...(body.recommendedDate !== undefined
          ? { recommendedDate: String(body.recommendedDate) }
          : {}),
        ...(body.recommendedTime !== undefined
          ? { recommendedTime: String(body.recommendedTime) }
          : {}),
        ...(Array.isArray(body.slides) ? { slides: body.slides } : {}),
        ...(Array.isArray(body.reelsScript) ? { reelsScript: body.reelsScript } : {}),
        ...(body.returnToApproval === true ? { status: 'aguardando_aprovacao' } : {}),
      },
      body.auditNote
    );

    if (!updated) {
      return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
    }

    return NextResponse.json({
      post: updated,
      message: 'Publicação atualizada com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao atualizar publicação:', error);
    return NextResponse.json(
      { error: 'Não foi possível atualizar a publicação.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const removed = await deletePost(id);
    if (!removed) {
      return NextResponse.json({ error: 'Publicação não encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, message: 'Publicação removida.' });
  } catch (error) {
    console.error('Erro ao remover publicação:', error);
    return NextResponse.json(
      { error: 'Não foi possível remover a publicação.' },
      { status: 500 }
    );
  }
}
