'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react';
import type { AspectRatioSpec, CarouselSlide } from '@/types/marketing';

interface InstagramPostPreviewProps {
  slides: CarouselSlide[];
  aspectRatio: AspectRatioSpec;
  brandHandle?: string;
  size?: 'normal' | 'large';
  activeIndex?: number;
  onActiveIndexChange?: (idx: number) => void;
  showExport?: boolean;
  onExpand?: () => void;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const test = `${current} ${words[i]}`;
      if (ctx.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export async function exportSlideAsPng(
  slide: CarouselSlide,
  aspectRatio: AspectRatioSpec,
  brandHandle = '@eujessynalin',
  filename = 'jessica-ai-arte.png'
): Promise<void> {
  const width = 1080;
  const height = aspectRatio === '1080x1920' ? 1920 : 1350;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Fundo por template
  const palettes = {
    ametista_editorial: { bg1: '#FBF8FE', bg2: '#EFE2F9', text: '#2B173B', accent: '#7B3FA0' },
    verde_acolhimento: { bg1: '#F4FBF8', bg2: '#DCF0E8', text: '#183C32', accent: '#3E8B74' },
    metodo_alma_dourado: { bg1: '#FFFDF8', bg2: '#F6ECE0', text: '#352417', accent: '#B3844E' },
    retrato_destaque: { bg1: '#2C1A3D', bg2: '#1D3D33', text: '#FFFFFF', accent: '#DFC8EE' },
  };
  const theme = palettes[slide.template] ?? palettes.ametista_editorial;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, theme.bg1);
  grad.addColorStop(1, theme.bg2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Imagem de fundo (quando houver)
  if (slide.imageUrl) {
    const img = await loadImage(slide.imageUrl);
    if (img) {
      const scale = Math.max(width / img.width, height / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      ctx.drawImage(img, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);

      if (slide.template === 'retrato_destaque') {
        const overlay = ctx.createLinearGradient(0, 0, 0, height);
        overlay.addColorStop(0, 'rgba(36, 17, 54, 0.42)');
        overlay.addColorStop(0.45, 'rgba(36, 17, 54, 0.16)');
        overlay.addColorStop(0.78, 'rgba(28, 16, 44, 0.86)');
        overlay.addColorStop(1, 'rgba(25, 48, 41, 0.95)');
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.82)';
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  // Moldura elegante para Método ALMA
  if (slide.template === 'metodo_alma_dourado') {
    ctx.strokeStyle = 'rgba(179, 132, 78, 0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(42, 42, width - 84, height - 84);
  }

  // Badge superior da marca
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.beginPath();
  ctx.roundRect(76, 76, 450, 68, 34);
  ctx.fill();

  const logoImg = await loadImage('/brand/jn-monogram.jpg');
  if (logoImg) {
    ctx.drawImage(logoImg, 96, 88, 44, 44);
  }
  ctx.fillStyle = '#3A1A52';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('JESSICA NALIN • MISSÃO EM FAMÍLIA', 154, 118);

  // Área textual inferior
  const marginX = 84;
  const maxTextWidth = width - marginX * 2;
  const headlineYStart = aspectRatio === '1080x1920' ? 1080 : 720;

  // Eyebrow
  if (slide.eyebrow) {
    ctx.fillStyle = theme.accent;
    ctx.font = '800 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(slide.eyebrow.toUpperCase(), marginX, headlineYStart - 34);
  }

  // Headline
  ctx.fillStyle = theme.text;
  ctx.font = '700 64px Georgia, serif';
  const headlineLines = wrapCanvasText(ctx, slide.headline, maxTextWidth).slice(0, 4);
  let cursorY = headlineYStart + 36;
  for (const line of headlineLines) {
    ctx.fillText(line, marginX, cursorY);
    cursorY += 78;
  }

  // Body
  ctx.fillStyle = theme.text;
  ctx.globalAlpha = 0.9;
  ctx.font = '500 34px "Plus Jakarta Sans", sans-serif';
  const bodyLines = wrapCanvasText(ctx, slide.body, maxTextWidth).slice(0, 5);
  cursorY += 20;
  for (const line of bodyLines) {
    ctx.fillText(line, marginX, cursorY);
    cursorY += 48;
  }
  ctx.globalAlpha = 1;

  // Rodapé
  const footerY = height - 92;
  ctx.strokeStyle =
    slide.template === 'retrato_destaque' ? 'rgba(255,255,255,0.25)' : 'rgba(58,26,82,0.18)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, footerY - 40);
  ctx.lineTo(width - marginX, footerY - 40);
  ctx.stroke();

  ctx.fillStyle = theme.text;
  ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(slide.footer || brandHandle, marginX, footerY);

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function InstagramPostPreview({
  slides,
  aspectRatio,
  brandHandle = '@eujessynalin',
  size = 'normal',
  activeIndex: controlledIndex,
  onActiveIndexChange,
  showExport = false,
  onExpand,
}: InstagramPostPreviewProps) {
  const [internalIndex, setInternalIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  const safeSlides: CarouselSlide[] =
    slides && slides.length > 0
      ? slides
      : [
          {
            id: 'fallback',
            order: 1,
            eyebrow: 'MISSÃO EM FAMÍLIA',
            headline: 'Prévia visual em preparo',
            body: 'Adicione um slide no Designer IA para visualizar aqui.',
            footer: brandHandle,
            template: 'ametista_editorial',
          },
        ];

  const currentIdx = Math.min(
    controlledIndex ?? internalIndex,
    safeSlides.length - 1
  );
  const activeSlide = safeSlides[currentIdx];

  const setIdx = (next: number) => {
    const clamped = (next + safeSlides.length) % safeSlides.length;
    if (onActiveIndexChange) {
      onActiveIndexChange(clamped);
    } else {
      setInternalIndex(clamped);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportSlideAsPng(
        activeSlide,
        aspectRatio,
        brandHandle,
        `jessica-nalin-slide-${currentIdx + 1}-${aspectRatio}.png`
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={`ig-frame-wrapper ${size === 'large' ? 'large' : ''}`}>
      <div
        className={`ig-artboard ${
          aspectRatio === '1080x1920' ? 'ratio-story' : 'ratio-feed'
        } tpl-${activeSlide.template}`}
      >
        {activeSlide.imageUrl && (
          <img
            src={activeSlide.imageUrl}
            alt={activeSlide.headline}
            className="ig-artboard-bg-img"
          />
        )}
        <div className="ig-artboard-overlay" />

        <div className="ig-top-bar">
          <span className="ig-brand-badge">
            <img src="/brand/jn-monogram.jpg" alt="Logo JN" />
            <span>JESSICA NALIN</span>
          </span>
          {safeSlides.length > 1 && (
            <span className="ig-slide-pill">
              {currentIdx + 1}/{safeSlides.length}
            </span>
          )}
        </div>

        <div className="ig-content-block">
          {activeSlide.eyebrow && (
            <span className="ig-eyebrow">{activeSlide.eyebrow}</span>
          )}
          <h4 className="ig-headline">{activeSlide.headline}</h4>
          {activeSlide.body && <p className="ig-body">{activeSlide.body}</p>}
          <div className="ig-footer">
            <span>{activeSlide.footer || brandHandle}</span>
            <span>{aspectRatio}</span>
          </div>
        </div>
      </div>

      {(safeSlides.length > 1 || showExport || onExpand) && (
        <div className="ig-controls">
          {safeSlides.length > 1 ? (
            <>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setIdx(currentIdx - 1)}
                aria-label="Slide anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="ig-dots" role="tablist" aria-label="Navegação dos slides">
                {safeSlides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`ig-dot ${idx === currentIdx ? 'active' : ''}`}
                    onClick={() => setIdx(idx)}
                    aria-label={`Ver slide ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setIdx(currentIdx + 1)}
                aria-label="Próximo slide"
              >
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Arte pronta • {aspectRatio} px
            </span>
          )}

          <div style={{ display: 'flex', gap: 6 }}>
            {onExpand && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={onExpand}
                title="Ampliar prévia"
                aria-label="Ampliar prévia visual"
              >
                <Maximize2 size={14} />
              </button>
            )}
            {showExport && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handleExport}
                disabled={exporting}
                title="Baixar imagem em alta resolução (PNG)"
              >
                <Download size={14} />
                {exporting ? 'Gerando...' : 'Baixar PNG'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
