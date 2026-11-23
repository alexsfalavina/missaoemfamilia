import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/session';
import { getSupabaseServerConfig } from '@/lib/supabase/client';
import { findMediaAssetByStoragePath } from '@/lib/store/repository';
import { sbCreateSignedDownloadUrl } from '@/lib/store/supabase-repository';

const SAFE_STORAGE_PATH_RE = /^(images|videos|uploads)\/[a-zA-Z0-9._-]+$/;
const EXPECTED_PRIVATE_BUCKET = 'jessica-media';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
};

/**
 * Gateway autenticado para visualização de mídias privadas do bucket `jessica-media`.
 * - Bloqueia usuários anônimos e contas inativas (401).
 * - Valida formato contra path traversal (400).
 * - Exige correspondência exata em `media_assets` (storage_path, storage_provider e bucket).
 * - Bloqueia acesso a caminhos não registrados (404).
 * - No Supabase Storage privado, gera URL assinada temporária (5 min) sem expor URLs públicas permanentes.
 * - Em fallback local, lê de `.data/uploads/` (fora de `public/`).
 */
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const storagePath = (searchParams.get('path') || '').trim();
  const format = (searchParams.get('format') || '').trim().toLowerCase();

  if (!SAFE_STORAGE_PATH_RE.test(storagePath) || storagePath.includes('..')) {
    return NextResponse.json(
      { error: 'Caminho de mídia inválido.' },
      { status: 400 }
    );
  }

  try {
    const registeredAsset = await findMediaAssetByStoragePath(storagePath);
    if (!registeredAsset || registeredAsset.storagePath !== storagePath) {
      return NextResponse.json(
        { error: 'Mídia não registrada ou não encontrada.' },
        { status: 404 }
      );
    }

    const supabaseCfg = getSupabaseServerConfig();

    if (supabaseCfg.configured) {
      if (
        supabaseCfg.storageBucket !== EXPECTED_PRIVATE_BUCKET ||
        registeredAsset.storageProvider !== 'supabase_storage' ||
        (!storagePath.startsWith('images/') && !storagePath.startsWith('videos/'))
      ) {
        return NextResponse.json(
          { error: 'Mídia incompatível com o bucket privado configurado.' },
          { status: 404 }
        );
      }

      const expiresInSeconds = 300;
      const signedUrl = await sbCreateSignedDownloadUrl(storagePath, expiresInSeconds);

      if (format === 'json') {
        return NextResponse.json(
          { signedUrl, expiresInSeconds },
          { headers: { 'Cache-Control': 'private, no-store' } }
        );
      }

      return NextResponse.redirect(signedUrl, {
        status: 307,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }

    if (
      registeredAsset.storageProvider === 'local' &&
      storagePath.startsWith('uploads/')
    ) {
      const filename = path.basename(storagePath);
      const localPath = path.join(process.cwd(), '.data', 'uploads', filename);
      const buffer = await fs.readFile(localPath);
      const ext = path.extname(filename).toLowerCase();
      const contentType = MIME_BY_EXT[ext] || 'application/octet-stream';

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(buffer.length),
          'Cache-Control': 'private, no-store',
        },
      });
    }

    return NextResponse.json({ error: 'Arquivo de mídia não encontrado.' }, { status: 404 });
  } catch (error) {
    console.error('Erro ao servir mídia privada:', error);
    return NextResponse.json(
      { error: 'Não foi possível acessar esta mídia privada.' },
      { status: 404 }
    );
  }
}
