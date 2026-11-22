import { NextRequest, NextResponse } from 'next/server';
import {
  getBrandProfile,
  resetBrandProfileToDefault,
  updateBrandProfile,
} from '@/lib/store/repository';

export async function GET() {
  try {
    const profile = await getBrandProfile();
    return NextResponse.json({ brand: profile });
  } catch (error) {
    console.error('Erro ao ler perfil da marca:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar o perfil da marca.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body.brandName !== 'string' || !body.brandName.trim()) {
      return NextResponse.json(
        { error: 'O nome da marca é obrigatório.' },
        { status: 400 }
      );
    }

    if (typeof body.instagramHandle !== 'string' || !body.instagramHandle.trim()) {
      return NextResponse.json(
        { error: 'O perfil do Instagram é obrigatório.' },
        { status: 400 }
      );
    }

    const normalizedHandle = body.instagramHandle.trim().startsWith('@')
      ? body.instagramHandle.trim()
      : `@${body.instagramHandle.trim()}`;
    const rawUsername = normalizedHandle.replace(/^@/, '');
    const normalizedUrl =
      typeof body.instagramUrl === 'string' && body.instagramUrl.trim()
        ? body.instagramUrl.trim()
        : `https://www.instagram.com/${rawUsername}/`;

    const updated = await updateBrandProfile({
      brandName: body.brandName.trim(),
      instagramHandle: normalizedHandle,
      instagramUrl: normalizedUrl,
      niche: String(body.niche ?? '').trim(),
      positioningPillars: Array.isArray(body.positioningPillars)
        ? body.positioningPillars.map((s: unknown) => String(s).trim()).filter(Boolean)
        : undefined,
      targetAudience: String(body.targetAudience ?? '').trim(),
      servicesOffered: Array.isArray(body.servicesOffered)
        ? body.servicesOffered.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
      verifiedCommercialInfo: body.verifiedCommercialInfo,
      brandVoice: String(body.brandVoice ?? '').trim(),
      brandValues: Array.isArray(body.brandValues)
        ? body.brandValues.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
      visualIdentity: body.visualIdentity,
      businessObjectives: Array.isArray(body.businessObjectives)
        ? body.businessObjectives.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [],
    });

    return NextResponse.json({
      brand: updated,
      message: 'Perfil da marca e informações comerciais verificadas salvos com sucesso.',
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil da marca:', error);
    return NextResponse.json(
      { error: 'Não foi possível salvar o perfil da marca.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action === 'reset') {
      const brand = await resetBrandProfileToDefault();
      return NextResponse.json({
        brand,
        message: 'Perfil padrão de Jessica Nalin restaurado.',
      });
    }
    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao restaurar perfil:', error);
    return NextResponse.json(
      { error: 'Não foi possível restaurar o perfil da marca.' },
      { status: 500 }
    );
  }
}
