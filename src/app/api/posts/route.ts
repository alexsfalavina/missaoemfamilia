import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import {
  createPost,
  ensureActiveBatch,
  getBrandProfile,
  listMediaAssets,
  listPosts,
  listWeeklyBatches,
} from '@/lib/store/repository';
import { getGeminiMarketingService } from '@/lib/integrations/gemini';
import {
  FORMAT_META,
  getNextMondayIso,
  getWeekdayNameFromDate,
} from '@/lib/constants/labels';
import type {
  ApprovalStatus,
  ContentCategory,
  ContentFormat,
  ContentPost,
  StoryExecutionMode,
  StrategicObjective,
} from '@/types/marketing';

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as ApprovalStatus | 'todos' | null) ?? 'todos';
    const category = searchParams.get('category') ?? 'todos';
    const format = searchParams.get('format') ?? 'todos';
    const batchId = searchParams.get('batchId') || undefined;
    const includeAllBatches = searchParams.get('includeAllBatches') === 'true';

    const [posts, batches] = await Promise.all([
      listPosts({ batchId, status, category, format, includeAllBatches }),
      listWeeklyBatches(),
    ]);
    const activeBatch = batches.find((b) => b.status === 'ativo') ?? batches[0];

    return NextResponse.json({
      posts,
      batches,
      activeBatchId: activeBatch?.id || '',
      dataSource: 'demo',
    });
  } catch (error) {
    console.error('Erro ao listar publicações:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar as publicações.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ roles: ['owner', 'editor'] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const activeBatch = await ensureActiveBatch(auth.user.name);
    const targetBatchId =
      typeof body?.batchId === 'string' && body.batchId.trim()
        ? body.batchId.trim()
        : activeBatch.id;
    const defaultDate = activeBatch.weekStartDate || getNextMondayIso();

    if (body?.mode === 'generate') {
      const topic = String(body.topic ?? '').trim();
      if (!topic) {
        return NextResponse.json(
          { error: 'Informe um tema ou ideia para gerar o conteúdo.' },
          { status: 400 }
        );
      }

      const [brand, mediaLibrary] = await Promise.all([
        getBrandProfile(),
        listMediaAssets(),
      ]);
      const gemini = getGeminiMarketingService();
      const generated = await gemini.generateSingleContent({
        brand,
        batchId: targetBatchId,
        topic,
        category: (body.category as ContentCategory) || 'educativo',
        strategicObjective: body.strategicObjective as StrategicObjective | undefined,
        format: (body.format as ContentFormat) || 'carrossel',
        storyExecutionMode: body.storyExecutionMode as StoryExecutionMode | undefined,
        marketingObjective:
          String(body.marketingObjective ?? '').trim() ||
          'Oferecer valor educativo concreto e abrir conversas qualificadas com famílias.',
        recommendedDate: String(body.recommendedDate || defaultDate),
        recommendedTime: String(body.recommendedTime || '19:00'),
        mediaLibrary,
      });

      const saved = await createPost({
        ...generated,
        batchId: targetBatchId,
        weekLabel: activeBatch.weekLabel,
      });
      return NextResponse.json(
        {
          post: saved,
          message: 'Conteúdo criado com critérios editoriais verificados e enviado para aprovação.',
        },
        { status: 201 }
      );
    }

    const title = String(body?.title ?? '').trim();
    const caption = String(body?.caption ?? '').trim();
    const format = (body?.format as ContentFormat) || 'post_unico';
    const category = (body?.category as ContentCategory) || 'educativo';
    const recommendedDate = String(body?.recommendedDate || defaultDate);
    const recommendedTime = String(body?.recommendedTime || '19:00');
    const strategicObjective: StrategicObjective =
      body?.strategicObjective ??
      (category === 'comercial' || category === 'engajamento'
        ? 'captacao_clientes'
        : category === 'autoridade'
          ? 'autoridade_profissional'
          : 'crescimento_audiencia');

    if (!title || !caption) {
      return NextResponse.json(
        { error: 'Título e legenda são obrigatórios.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const formatSpec = FORMAT_META[format] ?? FORMAT_META.post_unico;
    const storyExecutionMode: StoryExecutionMode | undefined =
      format === 'stories'
        ? (body.storyExecutionMode as StoryExecutionMode) || 'publicacao_automatica'
        : undefined;

    const newPost: ContentPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      batchId: targetBatchId,
      weekLabel: String(body.weekLabel || activeBatch.weekLabel),
      dayOfWeek: getWeekdayNameFromDate(recommendedDate),
      title,
      category,
      strategicObjective,
      toneProfile: body.toneProfile || 'acolhedor_sereno',
      format,
      aspectRatio: formatSpec.aspectRatio,
      definedAudience:
        String(body.definedAudience ?? '').trim() ||
        'Pais e mães em busca de educação parental respeitosa e prática.',
      openingHook: String(body.openingHook ?? '').trim() || title,
      educationalValue:
        String(body.educationalValue ?? '').trim() ||
        String(body.marketingObjective ?? '').trim() ||
        'Orientação prática de educação parental.',
      marketingObjective:
        String(body.marketingObjective ?? '').trim() ||
        'Oferecer valor educativo e gerar interesse qualificado nos serviços de Jessica Nalin.',
      conversionFocus:
        String(body.conversionFocus ?? '').trim() ||
        'Convidar naturalmente famílias interessadas a enviarem mensagem no Direct.',
      serviceConnection: body.serviceConnection ? String(body.serviceConnection).trim() : undefined,
      caption,
      hashtags: Array.isArray(body.hashtags)
        ? body.hashtags.map((h: unknown) => String(h).trim()).filter(Boolean)
        : ['#educacaoparental', '#metodoalma', '#desenvolvimentoinfantil'],
      cta:
        String(body.cta ?? '').trim() ||
        'Envie uma mensagem no Direct (@eujessynalin) se desejar conhecer a Mentoria Familiar.',
      recommendedDate,
      recommendedTime,
      status: 'aguardando_aprovacao',
      publishingState: 'bloqueado_sem_integracao',
      dataSource: 'demo',
      storyExecutionMode,
      storyManualInstructions:
        storyExecutionMode === 'acao_manual_instagram'
          ? String(body.storyManualInstructions ?? '').trim() ||
            'Inserir manualmente adesivo interativo (enquete ou caixinha de perguntas) no app do Instagram.'
          : undefined,
      slides:
        Array.isArray(body.slides) && body.slides.length > 0
          ? body.slides
          : [
              {
                id: `sl-${Date.now()}`,
                order: 1,
                eyebrow: 'EDUCAÇÃO PARENTAL • MÉTODO ALMA',
                headline: title,
                body: caption.slice(0, 140),
                footer: '@eujessynalin',
                template: 'ametista_editorial',
              },
            ],
      reelsScript: Array.isArray(body.reelsScript) ? body.reelsScript : undefined,
      auditLog: [],
      createdAt: now,
      updatedAt: now,
    };

    if (format === 'reels') {
      newPost.reelsProduction = getGeminiMarketingService().buildReelsProductionFromScript(newPost);
    }

    const saved = await createPost(newPost);
    return NextResponse.json(
      {
        post: saved,
        message: 'Publicação salva e encaminhada para aprovação humana.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar publicação:', error);
    return NextResponse.json(
      { error: 'Não foi possível criar a publicação.' },
      { status: 500 }
    );
  }
}
