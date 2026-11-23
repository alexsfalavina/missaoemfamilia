import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import { getSupabaseServerConfig } from '@/lib/supabase/client';
import { sbCreateSignedUploadUrl } from '@/lib/store/supabase-repository';

const ALLOWED_MIME_PREFIXES = ['image/', 'video/'];
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB (compatível com Supabase Free Tier)

function sanitizeExtension(filename: string, mimeType: string): string {
  const ext = path.extname(filename).toLowerCase().replace(/[^a-z0-9.]/g, '');
  if (ext && ext.length <= 6) return ext;
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('quicktime')) return '.mov';
  if (mimeType.includes('webm')) return '.webm';
  return '.jpg';
}

/**
 * Gera URL assinada para upload direto do navegador ao Supabase Storage
 * (evita o limite de 4,5 MB das funções serverless na Vercel para vídeos de Reels).
 * Em ambiente local sem Supabase, indica o modo de envio direto local.
 */
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth({ roles: ['owner', 'editor'] });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const filename = String(body?.filename ?? '').trim();
    const mimeType = String(body?.mimeType ?? '').trim().toLowerCase();
    const fileSizeBytes = Number(body?.fileSizeBytes ?? 0);

    if (!filename || !mimeType) {
      return NextResponse.json(
        { error: 'Informe nome e tipo do arquivo para preparar o upload.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))) {
      return NextResponse.json(
        { error: 'Envie apenas imagens (JPG, PNG, WEBP) ou vídeos (MP4, MOV, WEBM).' },
        { status: 400 }
      );
    }

    if (fileSizeBytes > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'O arquivo excede o limite de 50 MB configurado para o plano Free.' },
        { status: 400 }
      );
    }

    const ext = sanitizeExtension(filename, mimeType);
    const folder = mimeType.startsWith('video/') ? 'videos' : 'images';
    const storagePath = `${folder}/jessica-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;

    if (getSupabaseServerConfig().configured) {
      const signed = await sbCreateSignedUploadUrl(storagePath);
      return NextResponse.json({
        mode: 'supabase_signed_url',
        signedUrl: signed.signedUrl,
        token: signed.token,
        assetUrl: signed.assetUrl,
        storagePath: signed.storagePath,
      });
    }

    return NextResponse.json({
      mode: 'local_multipart',
      uploadEndpoint: '/api/media',
      storagePath,
    });
  } catch (error) {
    console.error('Erro ao gerar URL assinada de upload:', error);
    return NextResponse.json(
      { error: 'Não foi possível preparar o upload direto do arquivo.' },
      { status: 500 }
    );
  }
}
