import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import {
  addMediaAsset,
  deleteMediaAsset,
  listMediaAssets,
} from '@/lib/store/repository';
import type { MediaAsset, MediaAssetCategory, MediaAuthenticity } from '@/types/marketing';

const VALID_CATEGORIES = new Set<MediaAssetCategory>([
  'foto_pessoal',
  'foto_profissional',
  'video',
  'logo_marca',
  'material_existente',
]);

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

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

export async function GET() {
  try {
    const assets = await listMediaAssets();
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Erro ao listar biblioteca de mídia:', error);
    return NextResponse.json(
      { error: 'Não foi possível carregar a biblioteca de mídia.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Envie um arquivo usando multipart/form-data.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const rawCategory = String(formData.get('category') || 'foto_profissional') as MediaAssetCategory;
    const rawName = String(formData.get('name') || '').trim();
    const notes = String(formData.get('notes') || '').trim();

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: 'Selecione um arquivo de imagem ou vídeo válido para enviar.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: 'O arquivo excede o limite de 50 MB.' },
        { status: 400 }
      );
    }

    const mimeType = file.type || 'application/octet-stream';
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Formato não suportado. Envie imagens (JPG, PNG, WEBP) ou vídeos (MP4, MOV, WEBM).' },
        { status: 400 }
      );
    }

    const category: MediaAssetCategory = VALID_CATEGORIES.has(rawCategory)
      ? rawCategory
      : isVideo
        ? 'video'
        : 'foto_profissional';

    const authenticity: MediaAuthenticity =
      category === 'logo_marca' ? 'logo_oficial' : 'autentico_jessica';

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = sanitizeExtension(file.name, mimeType);
    const storedFilename = `jessica-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
    const targetPath = path.join(uploadsDir, storedFilename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(targetPath, buffer);

    const asset: MediaAsset = {
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: rawName || file.name,
      category,
      authenticity,
      url: `/uploads/${storedFilename}`,
      mimeType,
      fileSizeBytes: file.size,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await addMediaAsset(asset);
    return NextResponse.json(
      {
        asset: saved,
        message: isVideo
          ? 'Vídeo gravado por Jessica enviado com sucesso para a Biblioteca de Mídia.'
          : 'Arquivo autêntico enviado com sucesso para a Biblioteca de Mídia.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao salvar mídia:', error);
    return NextResponse.json(
      { error: 'Não foi possível enviar o arquivo para a biblioteca.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Informe o ID do item de mídia.' }, { status: 400 });
    }
    const deleted = await deleteMediaAsset(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Item de mídia não encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, message: 'Item removido da biblioteca.' });
  } catch (error) {
    console.error('Erro ao remover mídia:', error);
    return NextResponse.json(
      { error: 'Não foi possível remover o item de mídia.' },
      { status: 500 }
    );
  }
}
