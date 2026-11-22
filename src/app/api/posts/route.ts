import { NextRequest, NextResponse } from 'next/server';
import { createPost, getBrandProfile, listPosts } from '@/lib/store/repository';
import { getGeminiMarketingService } from '@/lib/integrations/gemini';
import { FORMAT_META, getWeekdayNameFromDate } from '@/lib/constants/labels';
import type { ApprovalStatus, ContentCategory, ContentFormat, ContentPost } from '@/types/marketing';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') as ApprovalStatus | 'todos' | null) ?? 'todos';
    const category = searchParams.get('category') ?? 'todos';
    const format = searchParams.get('format') ?? 'todos';

    const posts = await listPosts({ status, category, format });
    return NextResponse.json({ posts, dataSource: 'demo' });
  } catch (error) {
    console.error('Erro ao listar publicações:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar as publicações.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Modo 1: Gerar conteúdo completo via serviço de IA (demo)
    if (body?.mode === 'generate') {
      const topic = String(body.topic ?? '').trim();
      if (!topic) {
        return NextResponse.json(
          { error: 'Informe um tema ou ideia para gerar o conteúdo.' },
          { status: 400 }
        );
      }

      const brand = await getBrandProfile();
      const gemini = getGeminiMarketingService();
      const generated = await gemini.generateSingleContent({
        brand,
        topic,
        category: (body.category as ContentCategory) || 'educativo',
        format: (body.format as ContentFormat) || 'carrossel',
        marketingObjective:
          String(body.marketingObjective ?? '').trim() ||
          'Atrair famílias qualificadas e estimular conversas no Direct.',
        recommendedDate: String(body.recommendedDate || '2026-11-26'),
        recommendedTime: String(body.recommendedTime || '19:00'),
      });

      const saved = await createPost(generated);
      return NextResponse.json(
        {
          post: saved,
          message: 'Conteúdo criado e enviado para a Central de Aprovação.',
        },
        { status: 201 }
      );
    }

    // Modo 2: Criação manual/editada pelo usuário
    const title = String(body?.title ?? '').trim();
    const caption = String(body?.caption ?? '').trim();
    const format = (body?.format as ContentFormat) || 'post_unico';
    const category = (body?.category as ContentCategory) || 'educativo';
    const recommendedDate = String(body?.recommendedDate || '2026-11-26');
    const recommendedTime = String(body?.recommendedTime || '19:00');

    if (!title || !caption) {
      return NextResponse.json(
        { error: 'Título e legenda são obrigatórios.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const formatSpec = FORMAT_META[format] ?? FORMAT_META.post_unico;

    const newPost: ContentPost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      weekLabel: String(body.weekLabel || 'Semana de 23/11 a 29/11'),
      dayOfWeek: getWeekdayNameFromDate(recommendedDate),
      title,
      category,
      format,
      aspectRatio: formatSpec.aspectRatio,
      marketingObjective:
        String(body.marketingObjective ?? '').trim() ||
        'Gerar interesse qualificado nos serviços de educação parental.',
      conversionFocus:
        String(body.conversionFocus ?? '').trim() ||
        'Direcionar pais interessados para o Direct ou link da bio.',
      caption,
      hashtags: Array.isArray(body.hashtags)
        ? body.hashtags.map((h: unknown) => String(h).trim()).filter(Boolean)
        : ['#educacaoparental', '#missaoemfamilia', '#metodoalma'],
      cta:
        String(body.cta ?? '').trim() ||
        'Comente "ALMA" ou envie mensagem no Direct para conversar conosco.',
      recommendedDate,
      recommendedTime,
      status: 'aguardando_aprovacao',
      publishingState: 'bloqueado_sem_integracao',
      dataSource: 'demo',
      slides:
        Array.isArray(body.slides) && body.slides.length > 0
          ? body.slides
          : [
              {
                id: `sl-${Date.now()}`,
                order: 1,
                eyebrow: 'MISSÃO EM FAMÍLIA',
                headline: title,
                body: caption.slice(0, 140),
                footer: '@eujessynalin',
                imageUrl: '/media/family-connection.jpg',
                template: 'ametista_editorial',
              },
            ],
      reelsScript: Array.isArray(body.reelsScript) ? body.reelsScript : undefined,
      auditLog: [],
      createdAt: now,
      updatedAt: now,
    };

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
