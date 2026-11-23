'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle2,
  CheckSquare,
  Download,
  Edit3,
  Film,
  Hand,
  History,
  Image as ImageIcon,
  Layers,
  Link2,
  Palette,
  Plus,
  Save,
  Scissors,
  Sparkles,
  Subtitles,
  Target,
  Trash2,
  Unlink,
  Upload,
  Wand2,
} from 'lucide-react';
import type {
  AspectRatioSpec,
  CarouselSlide,
  ContentCategory,
  ContentFormat,
  ContentPost,
  DesignTemplateId,
  MediaAsset,
  MediaAssetCategory,
  ReelsSubtitleCue,
  StoryExecutionMode,
  StrategicObjective,
  WeeklyBatch,
} from '@/types/marketing';
import {
  CATEGORY_META,
  FORMAT_META,
  MEDIA_AUTHENTICITY_META,
  MEDIA_CATEGORY_META,
  REELS_STAGE_META,
  STATUS_META,
  STORY_MODE_META,
  STRATEGIC_OBJECTIVE_META,
  TEMPLATE_META,
  formatPtDate,
  getNextMondayIso,
} from '@/lib/constants/labels';
import { InstagramPostPreview } from '@/components/InstagramPostPreview';
import {
  DemoDataBanner,
  ErrorBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

type ContentTab = 'estrategia' | 'criador' | 'reels' | 'designer' | 'midia';

function buildSrtContent(subtitles: ReelsSubtitleCue[]): string {
  return subtitles
    .map((cue, idx) => {
      const start = `00:${cue.startTime.trim()},000`;
      const end = `00:${cue.endTime.trim()},000`;
      return `${idx + 1}\n${start} --> ${end}\n${cue.text.trim()}\n`;
    })
    .join('\n');
}

async function uploadFileViaDirectFlow(params: {
  file: File;
  category: MediaAssetCategory;
  name: string;
  notes?: string;
  batchId?: string;
  postId?: string;
}): Promise<{ asset: MediaAsset; message: string }> {
  const prepRes = await fetch('/api/media/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: params.file.name,
      mimeType: params.file.type || 'application/octet-stream',
      fileSizeBytes: params.file.size,
    }),
  });
  const prep = await prepRes.json();
  if (!prepRes.ok) {
    throw new Error(prep.error || 'Não foi possível preparar o upload do arquivo.');
  }

  if (prep.mode === 'supabase_signed_url' && prep.signedUrl) {
    const putRes = await fetch(prep.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': params.file.type || 'application/octet-stream',
        'x-upsert': 'true',
      },
      body: params.file,
    });
    if (!putRes.ok) {
      throw new Error('Falha ao enviar o arquivo diretamente ao Supabase Storage.');
    }

    const regRes = await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name || params.file.name,
        category: params.category,
        url: prep.assetUrl,
        storagePath: prep.storagePath,
        mimeType: params.file.type || 'application/octet-stream',
        fileSizeBytes: params.file.size,
        notes: params.notes,
        batchId: params.batchId || undefined,
        postId: params.postId || undefined,
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) {
      throw new Error(regData.error || 'Erro ao registrar a mídia enviada.');
    }
    return { asset: regData.asset as MediaAsset, message: regData.message };
  }

  // Fallback local direto via multipart/form-data
  const fd = new FormData();
  fd.append('file', params.file);
  fd.append('category', params.category);
  fd.append('name', params.name || params.file.name);
  if (params.notes) fd.append('notes', params.notes);
  if (params.batchId) fd.append('batchId', params.batchId);
  if (params.postId) fd.append('postId', params.postId);

  const upRes = await fetch('/api/media', { method: 'POST', body: fd });
  const upData = await upRes.json();
  if (!upRes.ok) {
    throw new Error(upData.error || 'Falha ao enviar arquivo.');
  }
  return { asset: upData.asset as MediaAsset, message: upData.message };
}

function ContentManagementInner() {
  const { canEdit, canManageMedia } = useCurrentUser();
  const searchParams = useSearchParams();
  const initialEditId = searchParams.get('edit');
  const initialTabParam = searchParams.get('tab') as ContentTab | null;
  const initialPostParam = searchParams.get('post');

  const [activeTab, setActiveTab] = useState<ContentTab>(
    initialTabParam && ['estrategia', 'criador', 'reels', 'designer', 'midia'].includes(initialTabParam)
      ? initialTabParam
      : initialEditId
        ? 'criador'
        : 'estrategia'
  );
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [batches, setBatches] = useState<WeeklyBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  // Tab 1: Estratégia Semanal IA
  const [focusTheme, setFocusTheme] = useState('');
  const [weekStartDate, setWeekStartDate] = useState(() => getNextMondayIso());
  const [generatingWeek, setGeneratingWeek] = useState(false);

  // Tab 2: Criador / Editor de Conteúdo
  const [editingId, setEditingId] = useState<string | null>(initialEditId);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ContentCategory>('educativo');
  const [formObjectiveType, setFormObjectiveType] =
    useState<StrategicObjective>('crescimento_audiencia');
  const [formFormat, setFormFormat] = useState<ContentFormat>('carrossel');
  const [formStoryMode, setFormStoryMode] =
    useState<StoryExecutionMode>('publicacao_automatica');
  const [formStoryManualNote, setFormStoryManualNote] = useState('');
  const [formAudience, setFormAudience] = useState('');
  const [formHook, setFormHook] = useState('');
  const [formEducationalValue, setFormEducationalValue] = useState('');
  const [formObjective, setFormObjective] = useState('');
  const [formServiceConnection, setFormServiceConnection] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formHashtags, setFormHashtags] = useState(
    '#educacaoparental #desenvolvimentoinfantil #metodoalma'
  );
  const [formCta, setFormCta] = useState(
    'Salve este conteúdo ou envie uma mensagem no Direct (@eujessynalin) se desejar conhecer a Mentoria Familiar.'
  );
  const [formDate, setFormDate] = useState(() => getNextMondayIso());
  const [formTime, setFormTime] = useState('19:00');
  const [savingPost, setSavingPost] = useState(false);

  // Tab 3: Produção de Reels
  const [reelsPostId, setReelsPostId] = useState<string>(initialPostParam || '');
  const [reelsSubtitles, setReelsSubtitles] = useState<ReelsSubtitleCue[]>([]);
  const [reelsSuggestions, setReelsSuggestions] = useState<string[]>([]);
  const [newSuggestion, setNewSuggestion] = useState('');
  const [uploadingReelVideo, setUploadingReelVideo] = useState(false);
  const [savingReels, setSavingReels] = useState(false);

  // Tab 4: Designer IA
  const [designerPostId, setDesignerPostId] = useState<string>('');
  const [designerSlides, setDesignerSlides] = useState<CarouselSlide[]>([]);
  const [designerAspect, setDesignerAspect] = useState<AspectRatioSpec>('1080x1350');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [savingDesign, setSavingDesign] = useState(false);

  // Tab 5: Biblioteca de Mídia Autêntica + Associação a Lotes e Conteúdos
  const [uploadCategory, setUploadCategory] = useState<MediaAssetCategory>('foto_profissional');
  const [uploadName, setUploadName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadLinkBatchId, setUploadLinkBatchId] = useState('');
  const [uploadLinkPostId, setUploadLinkPostId] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [linkingAssetId, setLinkingAssetId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const syncReelsEditorFromPost = useCallback((post: ContentPost | undefined) => {
    if (!post) return;
    setReelsPostId(post.id);
    setReelsSubtitles(
      post.reelsProduction?.subtitles ??
        (post.reelsScript ?? []).map((sc, idx) => {
          const [start, end] = sc.timeRange.split(/[–-]/).map((s) => s.trim());
          return {
            id: `sub-${idx + 1}`,
            startTime: start || `00:${String(idx * 10).padStart(2, '0')}`,
            endTime: end || `00:${String((idx + 1) * 10).padStart(2, '0')}`,
            text: sc.spokenLine,
          };
        })
    );
    setReelsSuggestions(
      post.reelsProduction?.editingSuggestions ?? [
        'Remover pausas iniciais para iniciar o gancho no primeiro segundo.',
        'Posicionar legendas acima dos 22% inferiores (zona segura do Reels).',
      ]
    );
  }, []);

  const loadAll = useCallback(async (batchOverride?: string) => {
    setLoading(true);
    setError(null);
    try {
      const targetBatch = batchOverride ?? selectedBatchId;
      const postsUrl = targetBatch
        ? `/api/posts?batchId=${encodeURIComponent(targetBatch)}`
        : '/api/posts';
      const [postsRes, mediaRes] = await Promise.all([
        fetch(postsUrl, { cache: 'no-store' }),
        fetch('/api/media', { cache: 'no-store' }),
      ]);
      if (!postsRes.ok) throw new Error('Não foi possível carregar os conteúdos.');
      const postsData = await postsRes.json();
      const mediaData = mediaRes.ok ? await mediaRes.json() : { assets: [] };

      const fetchedPosts: ContentPost[] = postsData.posts || [];
      setPosts(fetchedPosts);
      if (Array.isArray(postsData.batches)) {
        setBatches(postsData.batches);
        if (!targetBatch && postsData.activeBatchId) {
          setSelectedBatchId(postsData.activeBatchId);
          setUploadLinkBatchId(postsData.activeBatchId);
        }
      }
      setMediaAssets(mediaData.assets || []);

      if (fetchedPosts.length > 0) {
        const targetDesign =
          fetchedPosts.find((p) => p.id === designerPostId) ??
          fetchedPosts.find((p) => p.id === initialEditId) ??
          fetchedPosts[0];
        setDesignerPostId(targetDesign.id);
        setDesignerSlides(targetDesign.slides);
        setDesignerAspect(targetDesign.aspectRatio);

        const targetReel =
          fetchedPosts.find((p) => p.id === (initialPostParam || reelsPostId) && p.format === 'reels') ??
          fetchedPosts.find((p) => p.format === 'reels') ??
          fetchedPosts[0];
        syncReelsEditorFromPost(targetReel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conteúdos.');
    } finally {
      setLoading(false);
    }
  }, [designerPostId, initialEditId, initialPostParam, reelsPostId, selectedBatchId, syncReelsEditorFromPost]);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const populateCreatorFromPost = useCallback((post: ContentPost) => {
    setEditingId(post.id);
    setFormTitle(post.title);
    setFormCategory(post.category);
    setFormObjectiveType(post.strategicObjective);
    setFormFormat(post.format);
    setFormStoryMode(post.storyExecutionMode ?? 'publicacao_automatica');
    setFormStoryManualNote(post.storyManualInstructions ?? '');
    setFormAudience(post.definedAudience);
    setFormHook(post.openingHook);
    setFormEducationalValue(post.educationalValue);
    setFormObjective(post.marketingObjective);
    setFormServiceConnection(post.serviceConnection ?? '');
    setFormCaption(post.caption);
    setFormHashtags(post.hashtags.join(' '));
    setFormCta(post.cta);
    setFormDate(post.recommendedDate);
    setFormTime(post.recommendedTime);
  }, []);

  useEffect(() => {
    if (initialEditId && posts.length > 0) {
      const found = posts.find((p) => p.id === initialEditId);
      if (found) {
        populateCreatorFromPost(found);
        setActiveTab('criador');
      }
    }
  }, [initialEditId, posts, populateCreatorFromPost]);

  const resetCreatorToNew = () => {
    setEditingId(null);
    setFormTitle('');
    setFormCategory('educativo');
    setFormObjectiveType('crescimento_audiencia');
    setFormFormat('carrossel');
    setFormStoryMode('publicacao_automatica');
    setFormStoryManualNote('');
    setFormAudience('');
    setFormHook('');
    setFormEducationalValue('');
    setFormObjective('');
    setFormServiceConnection('');
    setFormCaption('');
    setFormHashtags('#educacaoparental #desenvolvimentoinfantil #metodoalma');
    setFormCta(
      'Salve este conteúdo ou envie uma mensagem no Direct (@eujessynalin) se desejar conhecer a Mentoria Familiar.'
    );
    setFormDate(getNextMondayIso());
    setFormTime('19:00');
  };

  // Equilíbrio dos 3 Objetivos Estratégicos (A, B, C)
  const objectiveBreakdown = useMemo(() => {
    const keys: StrategicObjective[] = [
      'crescimento_audiencia',
      'autoridade_profissional',
      'captacao_clientes',
    ];
    return keys.map((obj) => ({
      obj,
      meta: STRATEGIC_OBJECTIVE_META[obj],
      count: posts.filter((p) => p.strategicObjective === obj).length,
    }));
  }, [posts]);

  const reelsPosts = useMemo(
    () => posts.filter((p) => p.format === 'reels'),
    [posts]
  );
  const activeReelPost = useMemo(
    () => posts.find((p) => p.id === reelsPostId) ?? reelsPosts[0] ?? posts[0],
    [posts, reelsPostId, reelsPosts]
  );

  const imageAssets = useMemo(
    () => mediaAssets.filter((m) => m.mimeType.startsWith('image/')),
    [mediaAssets]
  );

  const handleGenerateWeeklyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneratingWeek(true);
    try {
      const res = await fetch('/api/strategy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStartDate, focusTheme }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar estratégia.');
      const nextPosts: ContentPost[] = data.posts || [];
      setPosts(nextPosts);
      if (data.batch) {
        const createdBatch = data.batch as WeeklyBatch;
        setBatches((prev) => [
          createdBatch,
          ...prev.map((b) => (b.status === 'ativo' ? { ...b, status: 'arquivado' as const } : b)),
        ]);
        setSelectedBatchId(createdBatch.id);
        setUploadLinkBatchId(createdBatch.id);
      }
      if (nextPosts[0]) {
        setDesignerPostId(nextPosts[0].id);
        setDesignerSlides(nextPosts[0].slides);
        setDesignerAspect(nextPosts[0].aspectRatio);
      }
      const nextReel = nextPosts.find((p) => p.format === 'reels');
      if (nextReel) syncReelsEditorFromPost(nextReel);
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', data.message || 'Novo plano semanal equilibrado gerado!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha ao gerar plano.');
    } finally {
      setGeneratingWeek(false);
    }
  };

  const handleSaveCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formCaption.trim()) {
      showToast('error', 'Preencha o título e a legenda antes de salvar.');
      return;
    }

    setSavingPost(true);
    const parsedTags = formHashtags
      .split(/[\s,]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('#') ? t : `#${t}`));

    const payload = {
      batchId: selectedBatchId || undefined,
      title: formTitle,
      category: formCategory,
      strategicObjective: formObjectiveType,
      format: formFormat,
      storyExecutionMode: formFormat === 'stories' ? formStoryMode : undefined,
      storyManualInstructions:
        formFormat === 'stories' && formStoryMode === 'acao_manual_instagram'
          ? formStoryManualNote
          : undefined,
      definedAudience: formAudience,
      openingHook: formHook,
      educationalValue: formEducationalValue,
      marketingObjective: formObjective,
      serviceConnection: formServiceConnection,
      caption: formCaption,
      hashtags: parsedTags,
      cta: formCta,
      recommendedDate: formDate,
      recommendedTime: formTime,
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/posts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            returnToApproval: true,
            auditNote: 'Conteúdo editado no Criador e reenviado para aprovação.',
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar publicação.');
        setPosts((prev) => prev.map((p) => (p.id === editingId ? data.post : p)));
        window.dispatchEvent(new Event('jessica-marketing-updated'));
        showToast('success', 'Alterações salvas e enviadas para a Central de Aprovação!');
      } else {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro ao criar publicação.');
        setPosts((prev) => [...prev, data.post]);
        setEditingId(data.post.id);
        window.dispatchEvent(new Event('jessica-marketing-updated'));
        showToast('success', data.message || 'Novo conteúdo criado com sucesso!');
      }
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSavingPost(false);
    }
  };

  const handleQuickAiDraft = async () => {
    if (!formTitle.trim()) {
      showToast('error', 'Digite um tema no campo Título para a IA montar o rascunho.');
      return;
    }
    setSavingPost(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          batchId: selectedBatchId || undefined,
          topic: formTitle,
          category: formCategory,
          strategicObjective: formObjectiveType,
          format: formFormat,
          storyExecutionMode: formFormat === 'stories' ? formStoryMode : undefined,
          marketingObjective: formObjective,
          recommendedDate: formDate,
          recommendedTime: formTime,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao gerar conteúdo.');
      const created: ContentPost = data.post;
      setPosts((prev) => [...prev, created]);
      populateCreatorFromPost(created);
      setDesignerPostId(created.id);
      setDesignerSlides(created.slides);
      setDesignerAspect(created.aspectRatio);
      if (created.format === 'reels') syncReelsEditorFromPost(created);
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', data.message || 'Rascunho editorial completo gerado!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao gerar rascunho.');
    } finally {
      setSavingPost(false);
    }
  };

  // ---- Produção de Reels (Upload direto do vídeo gravado por Jessica + Legendas + Cortes + Capa) ----
  const handleUploadReelVideo = async (file: File | null) => {
    if (!file || !activeReelPost) return;
    setUploadingReelVideo(true);
    try {
      const { asset } = await uploadFileViaDirectFlow({
        file,
        category: 'video',
        name: `Reel gravado — ${activeReelPost.title.slice(0, 40)}`,
        notes: `Vídeo real gravado por Jessica para o Reel (${activeReelPost.dayOfWeek}).`,
        batchId: activeReelPost.batchId || selectedBatchId || undefined,
        postId: activeReelPost.id,
      });

      setMediaAssets((prev) => [asset, ...prev]);

      const patchRes = await fetch(`/api/posts/${activeReelPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reelsProduction: {
            stage: 'edicao_preparada',
            uploadedVideoAssetId: asset.id,
            uploadedVideoUrl: asset.url,
            uploadedVideoName: asset.name,
            subtitles: reelsSubtitles,
            editingSuggestions: reelsSuggestions,
            coverReady: activeReelPost.slides.length > 0,
          },
        }),
      });
      const patchData = await patchRes.json();
      if (!patchRes.ok) throw new Error(patchData.error || 'Erro ao vincular vídeo ao Reel.');

      setPosts((prev) => prev.map((p) => (p.id === activeReelPost.id ? patchData.post : p)));
      showToast('success', 'Vídeo real gravado por Jessica enviado e vinculado ao roteiro!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao enviar vídeo.');
    } finally {
      setUploadingReelVideo(false);
    }
  };

  const handleSaveReelsWorkflow = async (sendToApproval: boolean) => {
    if (!activeReelPost) return;
    setSavingReels(true);
    try {
      const res = await fetch(`/api/posts/${activeReelPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendReelsToApproval: sendToApproval,
          reelsProduction: {
            stage: sendToApproval
              ? 'pronto_para_aprovacao'
              : activeReelPost.reelsProduction?.uploadedVideoUrl
                ? 'edicao_preparada'
                : 'roteiro_pronto',
            uploadedVideoAssetId: activeReelPost.reelsProduction?.uploadedVideoAssetId,
            uploadedVideoUrl: activeReelPost.reelsProduction?.uploadedVideoUrl,
            uploadedVideoName: activeReelPost.reelsProduction?.uploadedVideoName,
            subtitles: reelsSubtitles,
            editingSuggestions: reelsSuggestions,
            coverReady: activeReelPost.slides.length > 0,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível salvar produção do Reel.');
      setPosts((prev) => prev.map((p) => (p.id === activeReelPost.id ? data.post : p)));
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', data.message || 'Produção do Reel salva!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar produção do Reel.');
    } finally {
      setSavingReels(false);
    }
  };

  const handleDownloadSrt = () => {
    if (!activeReelPost || reelsSubtitles.length === 0) return;
    const blob = new Blob([buildSrtContent(reelsSubtitles)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `legendas-${activeReelPost.id}.srt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('info', 'Arquivo de legendas .SRT baixado!');
  };

  // ---- Designer IA ----
  const selectDesignerPost = (postId: string) => {
    const found = posts.find((p) => p.id === postId);
    if (!found) return;
    setDesignerPostId(found.id);
    setDesignerSlides(found.slides);
    setDesignerAspect(found.aspectRatio);
    setActiveSlideIdx(0);
  };

  const currentSlide = designerSlides[activeSlideIdx] ?? designerSlides[0];

  const updateCurrentSlide = (patch: Partial<CarouselSlide>) => {
    setDesignerSlides((prev) =>
      prev.map((slide, idx) => (idx === activeSlideIdx ? { ...slide, ...patch } : slide))
    );
  };

  const addSlide = () => {
    const nextOrder = designerSlides.length + 1;
    const newSlide: CarouselSlide = {
      id: `sl-new-${Date.now()}`,
      order: nextOrder,
      eyebrow: `SLIDE ${nextOrder} • MÉTODO ALMA`,
      headline: 'Novo ponto prático para os pais',
      body: 'Escreva uma orientação clara, respeitosa e baseada no desenvolvimento infantil.',
      footer: '@eujessynalin',
      template: nextOrder % 2 === 0 ? 'verde_acolhimento' : 'ametista_editorial',
    };
    setDesignerSlides((prev) => [...prev, newSlide]);
    setActiveSlideIdx(designerSlides.length);
  };

  const removeCurrentSlide = () => {
    if (designerSlides.length <= 1) {
      showToast('error', 'A publicação precisa ter pelo menos 1 arte/slide.');
      return;
    }
    const nextSlides = designerSlides
      .filter((_, idx) => idx !== activeSlideIdx)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    setDesignerSlides(nextSlides);
    setActiveSlideIdx(Math.max(0, activeSlideIdx - 1));
  };

  const handleSaveDesign = async () => {
    if (!designerPostId) return;
    setSavingDesign(true);
    try {
      const res = await fetch(`/api/posts/${designerPostId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: designerSlides,
          aspectRatio: designerAspect,
          auditNote: 'Artes visuais atualizadas no Designer IA.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar arte.');
      setPosts((prev) => prev.map((p) => (p.id === designerPostId ? data.post : p)));
      showToast('success', 'Layout visual salvo e atualizado na Central de Aprovação!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar design.');
    } finally {
      setSavingDesign(false);
    }
  };

  // ---- Biblioteca de Mídia Autêntica (Upload Direto + Associação a Lotes e Conteúdos) ----
  const handleUploadMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      showToast('error', 'Selecione uma fotografia, vídeo ou material para enviar.');
      return;
    }
    setUploadingAsset(true);
    try {
      const { asset, message } = await uploadFileViaDirectFlow({
        file: uploadFile,
        category: uploadCategory,
        name: uploadName.trim() || uploadFile.name,
        notes: uploadNotes.trim() || undefined,
        batchId: uploadLinkBatchId || undefined,
        postId: uploadLinkPostId || undefined,
      });

      setMediaAssets((prev) => [asset, ...prev]);
      setUploadFile(null);
      setUploadName('');
      setUploadNotes('');
      setUploadLinkPostId('');
      const fileInput = document.getElementById('media-file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
      showToast('success', message || 'Arquivo adicionado à Biblioteca de Mídia!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha no upload.');
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleLinkMedia = async (
    mediaAssetId: string,
    target: { batchId?: string; postId?: string }
  ) => {
    if (!target.batchId && !target.postId) return;
    setLinkingAssetId(mediaAssetId);
    try {
      const res = await fetch('/api/media/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaAssetId, ...target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível associar a mídia.');
      setMediaAssets((prev) => prev.map((m) => (m.id === mediaAssetId ? data.asset : m)));
      showToast('success', 'Mídia associada com sucesso!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao associar mídia.');
    } finally {
      setLinkingAssetId(null);
    }
  };

  const handleUnlinkMedia = async (
    mediaAssetId: string,
    target: { batchId?: string; postId?: string }
  ) => {
    setLinkingAssetId(mediaAssetId);
    try {
      const res = await fetch('/api/media/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaAssetId, ...target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Não foi possível remover a associação.');
      setMediaAssets((prev) => prev.map((m) => (m.id === mediaAssetId ? data.asset : m)));
      showToast('info', 'Associação removida.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao remover associação.');
    } finally {
      setLinkingAssetId(null);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    try {
      const res = await fetch(`/api/media?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover item.');
      setMediaAssets((prev) => prev.filter((m) => m.id !== id));
      showToast('info', 'Item removido da Biblioteca de Mídia.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Não foi possível remover.');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestão de Conteúdo, Reels & Biblioteca</h1>
          <p className="page-description">
            Planeje lotes semanais equilibrados (Crescimento, Autoridade e Captação), produza
            Reels com gravações reais de Jessica, crie artes em 1080px e gerencie sua Biblioteca de
            Mídia autêntica.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/aprovacao" className="btn btn-primary">
            <CheckSquare size={16} />
            Ir para Central de Aprovação
          </Link>
        </div>
      </div>

      <DemoDataBanner compact />

      <div className="tabs-bar" role="tablist" aria-label="Módulos de Gestão de Conteúdo">
        <button
          type="button"
          role="tab"
          id="tab-estrategia"
          aria-selected={activeTab === 'estrategia'}
          className={`tab-btn ${activeTab === 'estrategia' ? 'active' : ''}`}
          onClick={() => setActiveTab('estrategia')}
        >
          <Sparkles size={15} />
          Estratégia Semanal
        </button>
        <button
          type="button"
          role="tab"
          id="tab-criador"
          aria-selected={activeTab === 'criador'}
          className={`tab-btn ${activeTab === 'criador' ? 'active' : ''}`}
          onClick={() => setActiveTab('criador')}
        >
          <Wand2 size={15} />
          Criador de Conteúdo
        </button>
        <button
          type="button"
          role="tab"
          id="tab-reels"
          aria-selected={activeTab === 'reels'}
          className={`tab-btn ${activeTab === 'reels' ? 'active' : ''}`}
          onClick={() => setActiveTab('reels')}
        >
          <Film size={15} />
          Produção de Reels
        </button>
        <button
          type="button"
          role="tab"
          id="tab-designer"
          aria-selected={activeTab === 'designer'}
          className={`tab-btn ${activeTab === 'designer' ? 'active' : ''}`}
          onClick={() => setActiveTab('designer')}
        >
          <Palette size={15} />
          Designer IA (1080px)
        </button>
        <button
          type="button"
          role="tab"
          id="tab-midia"
          aria-selected={activeTab === 'midia'}
          className={`tab-btn ${activeTab === 'midia' ? 'active' : ''}`}
          onClick={() => setActiveTab('midia')}
        >
          <ImageIcon size={15} />
          Biblioteca de Mídia ({mediaAssets.length})
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => loadAll()} />}
      {loading && <LoadingCards count={3} />}

      {/* ================================================================
          ABA 1: ESTRATÉGIA SEMANAL EQUILIBRADA (A, B, C)
         ================================================================ */}
      {!loading && !error && activeTab === 'estrategia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  Gerador de Estratégia Semanal (7 Publicações com Credibilidade Editorial)
                </h2>
                <p className="card-subtitle">
                  Equilibra Crescimento de audiência, Autoridade profissional e Captação de
                  clientes — gerando um novo lote sem apagar o histórico anterior.
                </p>
              </div>
              <span className="badge badge-green">Histórico Preservado</span>
            </div>

            <form
              onSubmit={handleGenerateWeeklyPlan}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.5fr) 190px auto',
                gap: 12,
                alignItems: 'end',
              }}
            >
              <div className="form-group">
                <label className="form-label" htmlFor="strategy-theme">
                  Foco editorial da semana (opcional)
                </label>
                <input
                  id="strategy-theme"
                  type="text"
                  className="input"
                  placeholder="Ex.: Transição de telas, Regulação emocional, Relação entre irmãos..."
                  value={focusTheme}
                  onChange={(e) => setFocusTheme(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="strategy-date">
                  Início (Segunda-feira)
                </label>
                <input
                  id="strategy-date"
                  type="date"
                  className="input"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  required
                />
              </div>

              {canEdit && (
                <button
                  type="submit"
                  id="strategy-generate-btn"
                  className="btn btn-primary"
                  disabled={generatingWeek}
                >
                  <Sparkles size={16} />
                  {generatingWeek ? 'Gerando lote...' : 'Gerar novo plano semanal'}
                </button>
              )}
            </form>
          </section>

          {/* Equilíbrio dos 3 Objetivos Estratégicos */}
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            {objectiveBreakdown.map(({ obj, meta, count }) => (
              <div key={obj} className="card card-compact">
                <div
                  className="meta-strip"
                  style={{ justifyContent: 'space-between', marginBottom: 6 }}
                >
                  <span className={`badge ${meta.toneClass}`}>{meta.label}</span>
                  <strong style={{ fontSize: '1.2rem' }}>{count}</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.79rem', color: 'var(--text-muted)' }}>
                  {meta.description}
                </p>
              </div>
            ))}
          </div>

          {/* Lista das 7 Publicações Estratégicas + Histórico de Lotes */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Plano Semanal ({posts.length} conteúdos)</h2>
                <p className="card-subtitle">
                  Cada item traz público definido, gancho de abertura, valor educativo e CTA natural
                </p>
              </div>
              {batches.length > 0 && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <History size={15} color="var(--purple-700)" />
                  <select
                    id="strategy-batch-selector"
                    aria-label="Selecionar lote semanal do histórico"
                    className="select"
                    style={{ maxWidth: 280, padding: '6px 10px', fontSize: '0.8rem' }}
                    value={selectedBatchId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedBatchId(nextId);
                      loadAll(nextId);
                    }}
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.status === 'ativo' ? '● Ativo: ' : 'Histórico: '}
                        {b.weekLabel}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {posts.map((post, idx) => (
                <div
                  key={post.id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div className="meta-strip" style={{ marginBottom: 6 }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--purple-800)' }}>
                        Dia {idx + 1} • {post.dayOfWeek} ({formatPtDate(post.recommendedDate)} às{' '}
                        {post.recommendedTime})
                      </strong>
                      <span
                        className={`badge ${STRATEGIC_OBJECTIVE_META[post.strategicObjective].toneClass}`}
                      >
                        {STRATEGIC_OBJECTIVE_META[post.strategicObjective].shortLabel}
                      </span>
                      <span className={`badge ${CATEGORY_META[post.category].toneClass}`}>
                        {CATEGORY_META[post.category].shortLabel}
                      </span>
                      <span className="badge badge-neutral">
                        {FORMAT_META[post.format].label}
                      </span>
                      {post.storyExecutionMode && (
                        <span
                          className={`badge ${STORY_MODE_META[post.storyExecutionMode].toneClass}`}
                        >
                          {STORY_MODE_META[post.storyExecutionMode].shortLabel}
                        </span>
                      )}
                      <span className={`badge ${STATUS_META[post.status].toneClass}`}>
                        {STATUS_META[post.status].shortLabel}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', marginBottom: 5 }}>
                      {post.title}
                    </div>
                    <div style={{ fontSize: '0.81rem', color: 'var(--text-secondary)' }}>
                      <Target size={13} style={{ display: 'inline', marginRight: 5 }} />
                      <strong>Público:</strong> {post.definedAudience}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      <strong>Gancho:</strong> {post.openingHook}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        populateCreatorFromPost(post);
                        setActiveTab('criador');
                      }}
                    >
                      <Edit3 size={14} />
                      Editar
                    </button>
                    {post.format === 'reels' && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          syncReelsEditorFromPost(post);
                          setActiveTab('reels');
                        }}
                      >
                        <Film size={14} />
                        Produzir Reel
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        selectDesignerPost(post.id);
                        setActiveTab('designer');
                      }}
                    >
                      <Palette size={14} />
                      Arte
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ================================================================
          ABA 2: CRIADOR DE CONTEÚDO (COM MODO STORIES MANUAL VS AUTOMÁTICO)
         ================================================================ */}
      {!loading && !error && activeTab === 'criador' && (
        <div className="two-col-grid" style={{ alignItems: 'start' }}>
          <form onSubmit={handleSaveCreator} className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">
                  {editingId ? 'Editar Conteúdo Selecionado' : 'Criar Novo Conteúdo'}
                </h2>
                <p className="card-subtitle">
                  Com público definido, gancho, valor educativo, objetivo claro e distinção de Stories
                </p>
              </div>
              {editingId && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={resetCreatorToNew}
                >
                  <Plus size={14} />
                  Novo do zero
                </button>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label className="form-label" htmlFor="creator-title">
                  Título / Tema principal
                </label>
                <input
                  id="creator-title"
                  type="text"
                  className="input"
                  placeholder="Ex.: Como apoiar a regulação emocional após um dia agitado na escola"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="creator-format">
                  Formato
                </label>
                <select
                  id="creator-format"
                  className="select"
                  value={formFormat}
                  onChange={(e) => setFormFormat(e.target.value as ContentFormat)}
                >
                  <option value="carrossel">Carrossel (1080×1350)</option>
                  <option value="reels">Roteiro de Reels (1080×1920)</option>
                  <option value="post_unico">Post de Imagem Única (1080×1350)</option>
                  <option value="stories">Sequência de Stories (1080×1920)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="creator-objective-type">
                  Objetivo Estratégico (A / B / C)
                </label>
                <select
                  id="creator-objective-type"
                  className="select"
                  value={formObjectiveType}
                  onChange={(e) => setFormObjectiveType(e.target.value as StrategicObjective)}
                >
                  <option value="crescimento_audiencia">A. Crescimento de audiência</option>
                  <option value="autoridade_profissional">B. Autoridade profissional</option>
                  <option value="captacao_clientes">C. Captação de clientes</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="creator-category">
                  Pilar editorial
                </label>
                <select
                  id="creator-category"
                  className="select"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ContentCategory)}
                >
                  <option value="educativo">Educativo</option>
                  <option value="emocional">Relacionamento & Vínculo</option>
                  <option value="autoridade">Autoridade Profissional</option>
                  <option value="engajamento">Diálogo & Comunidade</option>
                  <option value="comercial">Captação & Serviços</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="creator-date">
                  Data e horário recomendados
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
                  <input
                    id="creator-date"
                    type="date"
                    className="input"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                  <input
                    id="creator-time"
                    type="time"
                    className="input"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Classificação obrigatória para Stories */}
              {formFormat === 'stories' && (
                <>
                  <div className="form-group full">
                    <label className="form-label" htmlFor="creator-story-mode">
                      Modo de execução dos Stories
                    </label>
                    <select
                      id="creator-story-mode"
                      className="select"
                      value={formStoryMode}
                      onChange={(e) => setFormStoryMode(e.target.value as StoryExecutionMode)}
                    >
                      <option value="publicacao_automatica">
                        Apto para publicação automática (sem adesivos interativos)
                      </option>
                      <option value="acao_manual_instagram">
                        Requer ação manual no Instagram (enquete, caixinha de perguntas ou adesivo)
                      </option>
                    </select>
                  </div>
                  {formStoryMode === 'acao_manual_instagram' && (
                    <div className="form-group full">
                      <label className="form-label" htmlFor="creator-story-manual-note">
                        Checklist de intervenção manual no app do Instagram
                      </label>
                      <textarea
                        id="creator-story-manual-note"
                        className="textarea"
                        style={{ minHeight: 72 }}
                        placeholder="Ex.: Inserir adesivo de Enquete na Tela 1 e Caixinha de Perguntas na Tela 2."
                        value={formStoryManualNote}
                        onChange={(e) => setFormStoryManualNote(e.target.value)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-audience">
                  Público definido para esta publicação
                </label>
                <input
                  id="creator-audience"
                  type="text"
                  className="input"
                  placeholder="Ex.: Pais de crianças de 4 a 9 anos enfrentando resistência na rotina noturna"
                  value={formAudience}
                  onChange={(e) => setFormAudience(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-hook">
                  Gancho de abertura (sem sensacionalismo)
                </label>
                <input
                  id="creator-hook"
                  type="text"
                  className="input"
                  value={formHook}
                  onChange={(e) => setFormHook(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-value">
                  Valor educativo entregue
                </label>
                <input
                  id="creator-value"
                  type="text"
                  className="input"
                  value={formEducationalValue}
                  onChange={(e) => setFormEducationalValue(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-objective">
                  Objetivo de marketing
                </label>
                <input
                  id="creator-objective"
                  type="text"
                  className="input"
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-service">
                  Conexão natural com serviço verificado (opcional)
                </label>
                <input
                  id="creator-service"
                  type="text"
                  className="input"
                  placeholder="Ex.: Pilar Limites do Método ALMA / Mentoria Familiar"
                  value={formServiceConnection}
                  onChange={(e) => setFormServiceConnection(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-caption">
                  Legenda para o Instagram
                </label>
                <textarea
                  id="creator-caption"
                  className="textarea"
                  style={{ minHeight: 150 }}
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-cta">
                  Chamada para ação natural (CTA)
                </label>
                <input
                  id="creator-cta"
                  type="text"
                  className="input"
                  value={formCta}
                  onChange={(e) => setFormCta(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-hashtags">
                  Hashtags
                </label>
                <input
                  id="creator-hashtags"
                  type="text"
                  className="input"
                  value={formHashtags}
                  onChange={(e) => setFormHashtags(e.target.value)}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                marginTop: 18,
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {canEdit && (
                <>
                  <button
                    type="submit"
                    id="creator-save-btn"
                    className="btn btn-primary"
                    disabled={savingPost}
                  >
                    <Save size={16} />
                    {savingPost
                      ? 'Salvando...'
                      : editingId
                        ? 'Salvar e enviar para aprovação'
                        : 'Salvar publicação'}
                  </button>

                  {!editingId && (
                    <button
                      type="button"
                      id="creator-ai-generate-btn"
                      className="btn btn-secondary"
                      disabled={savingPost}
                      onClick={handleQuickAiDraft}
                    >
                      <Sparkles size={16} />
                      Gerar rascunho editorial (Demo)
                    </button>
                  )}
                </>
              )}
            </div>
          </form>

          <aside className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Publicações da Semana</h2>
                <p className="card-subtitle">Clique para carregar no editor</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => populateCreatorFromPost(post)}
                  style={{
                    textAlign: 'left',
                    padding: '11px 12px',
                    borderRadius: 12,
                    border:
                      editingId === post.id
                        ? '1.5px solid var(--purple-600)'
                        : '1px solid var(--border-subtle)',
                    background: editingId === post.id ? 'var(--purple-50)' : 'var(--bg-elevated)',
                    cursor: 'pointer',
                  }}
                >
                  <div className="meta-strip" style={{ marginBottom: 4 }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                      {FORMAT_META[post.format].label}
                    </span>
                    {post.storyExecutionMode && (
                      <span
                        className={`badge ${STORY_MODE_META[post.storyExecutionMode].toneClass}`}
                        style={{ fontSize: '0.66rem' }}
                      >
                        <Hand size={10} />
                        {STORY_MODE_META[post.storyExecutionMode].shortLabel}
                      </span>
                    )}
                    <span
                      className={`badge ${STATUS_META[post.status].toneClass}`}
                      style={{ fontSize: '0.68rem' }}
                    >
                      {STATUS_META[post.status].shortLabel}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {post.title}
                  </div>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* ================================================================
          ABA 3: FLUXO DE PRODUÇÃO DE REELS (SEM FILMAGEM FALSA DE JESSICA)
         ================================================================ */}
      {!loading && !error && activeTab === 'reels' && activeReelPost && (
        <div className="two-col-grid" style={{ alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <section className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Fluxo de Produção de Reels (Gravação Real de Jessica)</h2>
                  <p className="card-subtitle">
                    Roteiro → Upload do vídeo real → Legendas (.SRT) → Sugestões de cortes → Capa
                    1080×1920 → Aprovação
                  </p>
                </div>
                {activeReelPost.reelsProduction && (
                  <span
                    className={`badge ${REELS_STAGE_META[activeReelPost.reelsProduction.stage].toneClass}`}
                  >
                    {REELS_STAGE_META[activeReelPost.reelsProduction.stage].label}
                  </span>
                )}
              </div>

              <div
                style={{
                  background: 'var(--green-50)',
                  border: '1px solid var(--green-200)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  fontSize: '0.82rem',
                  color: 'var(--green-800)',
                  marginBottom: 14,
                }}
              >
                <strong>Autenticidade garantida:</strong> a plataforma nunca gera vídeos sintéticos
                ou filmagens falsas de Jessica. Você grava com naturalidade usando o roteiro abaixo
                e envia seu vídeo real.
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" htmlFor="reels-post-selector">
                  Selecionar publicação de Reel
                </label>
                <select
                  id="reels-post-selector"
                  className="select"
                  value={activeReelPost.id}
                  onChange={(e) => {
                    const found = posts.find((p) => p.id === e.target.value);
                    syncReelsEditorFromPost(found);
                  }}
                >
                  {(reelsPosts.length > 0 ? reelsPosts : posts).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.dayOfWeek} — {p.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Passo 1: Roteiro */}
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>
                  1. Roteiro do Reel ({activeReelPost.reelsScript?.length ?? 0} cenas)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(activeReelPost.reelsScript ?? []).map((sc) => (
                    <div
                      key={sc.id}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: '10px 12px',
                        background: 'var(--bg-elevated)',
                        fontSize: '0.82rem',
                      }}
                    >
                      <div style={{ fontWeight: 800, color: 'var(--purple-800)' }}>
                        {sc.timeRange} • Texto em tela: {sc.onScreenText}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        <strong>Fala sugerida:</strong> “{sc.spokenLine}”
                      </div>
                      <div style={{ marginTop: 2, color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                        Enquadramento: {sc.visualDirection}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Passo 2: Upload do Vídeo Gravado por Jessica */}
              <div
                style={{
                  border: '1px dashed var(--border-strong)',
                  borderRadius: 14,
                  padding: 16,
                  background: 'var(--purple-50)',
                  marginBottom: 18,
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: 6 }}>
                  2. Enviar vídeo gravado por Jessica (MP4, MOV ou WEBM)
                </div>
                <p style={{ margin: '0 0 10px', fontSize: '0.79rem', color: 'var(--text-secondary)' }}>
                  O arquivo é armazenado na Biblioteca de Mídia como gravação autêntica e vinculado
                  diretamente a este Reel.
                </p>
                {canManageMedia && (
                  <input
                    id="reel-video-upload-input"
                    type="file"
                    accept="video/mp4,video/quicktime,video/webm"
                    disabled={uploadingReelVideo}
                    onChange={(e) => handleUploadReelVideo(e.target.files?.[0] ?? null)}
                  />
                )}
                {uploadingReelVideo && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.8rem', fontWeight: 700 }}>
                    Enviando vídeo gravado...
                  </p>
                )}
                {activeReelPost.reelsProduction?.uploadedVideoUrl && (
                  <div style={{ marginTop: 12 }}>
                    <span className="badge badge-green" style={{ marginBottom: 8 }}>
                      <CheckCircle2 size={13} />
                      Vídeo anexado: {activeReelPost.reelsProduction.uploadedVideoName}
                    </span>
                    <video
                      src={activeReelPost.reelsProduction.uploadedVideoUrl}
                      controls
                      style={{
                        width: '100%',
                        maxHeight: 280,
                        borderRadius: 12,
                        background: '#000',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Passo 3: Legendas Sincronizadas */}
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.9rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <Subtitles size={16} />
                    3. Legendas Preparadas (editáveis)
                  </h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleDownloadSrt}
                  >
                    <Download size={13} />
                    Baixar .SRT
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reelsSubtitles.map((cue, idx) => (
                    <div
                      key={cue.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '78px 78px minmax(0, 1fr)',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        className="input"
                        value={cue.startTime}
                        onChange={(e) =>
                          setReelsSubtitles((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, startTime: e.target.value } : c
                            )
                          )
                        }
                        aria-label={`Início legenda ${idx + 1}`}
                      />
                      <input
                        className="input"
                        value={cue.endTime}
                        onChange={(e) =>
                          setReelsSubtitles((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, endTime: e.target.value } : c
                            )
                          )
                        }
                        aria-label={`Fim legenda ${idx + 1}`}
                      />
                      <input
                        className="input"
                        value={cue.text}
                        onChange={(e) =>
                          setReelsSubtitles((prev) =>
                            prev.map((c, i) => (i === idx ? { ...c, text: e.target.value } : c))
                          )
                        }
                        aria-label={`Texto legenda ${idx + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Passo 4: Sugestões de Cortes e Melhorias de Edição */}
              <div style={{ marginBottom: 18 }}>
                <h3
                  style={{
                    margin: '0 0 8px',
                    fontSize: '0.9rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Scissors size={16} />
                  4. Sugestões de Cortes e Melhorias de Edição
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {reelsSuggestions.map((sug, idx) => (
                    <div
                      key={`${sug}-${idx}`}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 10,
                        background: 'var(--bg-subtle)',
                        fontSize: '0.82rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span>• {sug}</span>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() =>
                          setReelsSuggestions((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    placeholder="Adicionar orientação de corte ou ritmo..."
                    value={newSuggestion}
                    onChange={(e) => setNewSuggestion(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (!newSuggestion.trim()) return;
                      setReelsSuggestions((prev) => [...prev, newSuggestion.trim()]);
                      setNewSuggestion('');
                    }}
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                </div>
              </div>

              {canEdit && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={savingReels}
                    onClick={() => handleSaveReelsWorkflow(false)}
                  >
                    <Save size={15} />
                    Salvar rascunho da edição
                  </button>
                  <button
                    type="button"
                    id="reels-save-approval-btn"
                    className="btn btn-approve"
                    disabled={savingReels}
                    onClick={() => handleSaveReelsWorkflow(true)}
                  >
                    <CheckCircle2 size={15} />
                    Salvar vídeo finalizado para aprovação
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Passo 5: Capa 1080x1920 do Reel */}
          <aside
            className="card"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
          >
            <div style={{ width: '100%' }}>
              <h2 className="card-title">5. Capa do Reel (1080×1920)</h2>
              <p className="card-subtitle">
                Personalize a capa no Designer IA usando fotos autênticas de Jessica
              </p>
            </div>
            <InstagramPostPreview
              slides={activeReelPost.slides}
              aspectRatio="1080x1920"
              size="large"
              showExport
            />
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => {
                selectDesignerPost(activeReelPost.id);
                setActiveTab('designer');
              }}
            >
              <Palette size={15} />
              Personalizar capa no Designer IA
            </button>
          </aside>
        </div>
      )}

      {/* ================================================================
          ABA 4: DESIGNER IA (INTEGRADO À BIBLIOTECA DE MÍDIA AUTÊNTICA)
         ================================================================ */}
      {!loading && !error && activeTab === 'designer' && (
        <div className="two-col-grid" style={{ alignItems: 'start' }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Estúdio Visual — Identidade Jessica Nalin</h2>
                <p className="card-subtitle">
                  Suporta 1080×1350 (Feed), 1080×1920 (Stories/Reels) e carrosséis com fotos
                  autênticas da Biblioteca de Mídia
                </p>
              </div>
              {canEdit && (
                <button
                  type="button"
                  id="designer-save-btn"
                  className="btn btn-primary"
                  onClick={handleSaveDesign}
                  disabled={savingDesign || !designerPostId}
                >
                  <Save size={15} />
                  {savingDesign ? 'Salvando...' : 'Salvar arte'}
                </button>
              )}
            </div>

            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="designer-post-select">
                  Publicação selecionada
                </label>
                <select
                  id="designer-post-select"
                  className="select"
                  value={designerPostId}
                  onChange={(e) => selectDesignerPost(e.target.value)}
                >
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.dayOfWeek} — {p.title.slice(0, 48)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="designer-ratio-select">
                  Dimensão Instagram
                </label>
                <select
                  id="designer-ratio-select"
                  className="select"
                  value={designerAspect}
                  onChange={(e) => setDesignerAspect(e.target.value as AspectRatioSpec)}
                >
                  <option value="1080x1350">1080 × 1350 px (Feed / Carrossel 4:5)</option>
                  <option value="1080x1920">1080 × 1920 px (Stories / Capa Reels 9:16)</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 12,
                background: 'var(--bg-subtle)',
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Layers size={14} />
                Slides:
              </span>
              {designerSlides.map((sl, idx) => (
                <button
                  key={sl.id}
                  type="button"
                  className={`btn btn-sm ${idx === activeSlideIdx ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveSlideIdx(idx)}
                >
                  Slide {idx + 1}
                </button>
              ))}
              <button type="button" className="btn btn-sm btn-secondary" onClick={addSlide}>
                <Plus size={13} />
                Novo slide
              </button>
              {designerSlides.length > 1 && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={removeCurrentSlide}
                  style={{ marginLeft: 'auto' }}
                >
                  <Trash2 size={13} />
                  Remover
                </button>
              )}
            </div>

            {currentSlide && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label" htmlFor="slide-template">
                    Estilo da marca
                  </label>
                  <select
                    id="slide-template"
                    className="select"
                    value={currentSlide.template}
                    onChange={(e) =>
                      updateCurrentSlide({ template: e.target.value as DesignTemplateId })
                    }
                  >
                    {(Object.keys(TEMPLATE_META) as DesignTemplateId[]).map((tplKey) => (
                      <option key={tplKey} value={tplKey}>
                        {TEMPLATE_META[tplKey].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="slide-image">
                    Imagem da Biblioteca de Mídia
                  </label>
                  <select
                    id="slide-image"
                    className="select"
                    value={currentSlide.imageUrl || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = imageAssets.find((m) => m.url === val);
                      updateCurrentSlide({
                        imageUrl: val || undefined,
                        imageAuthenticity: found?.authenticity,
                      });
                    }}
                  >
                    <option value="">Sem foto (Layout Tipográfico Limpo)</option>
                    {imageAssets.map((m) => (
                      <option key={m.id} value={m.url}>
                        [{MEDIA_AUTHENTICITY_META[m.authenticity].shortLabel}] {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label className="form-label" htmlFor="slide-eyebrow">
                    Selo superior (Eyebrow)
                  </label>
                  <input
                    id="slide-eyebrow"
                    type="text"
                    className="input"
                    value={currentSlide.eyebrow || ''}
                    onChange={(e) => updateCurrentSlide({ eyebrow: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label className="form-label" htmlFor="slide-headline">
                    Título principal na arte
                  </label>
                  <input
                    id="slide-headline"
                    type="text"
                    className="input"
                    value={currentSlide.headline}
                    onChange={(e) => updateCurrentSlide({ headline: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label className="form-label" htmlFor="slide-body">
                    Texto complementar
                  </label>
                  <textarea
                    id="slide-body"
                    className="textarea"
                    value={currentSlide.body}
                    onChange={(e) => updateCurrentSlide({ body: e.target.value })}
                  />
                </div>

                <div className="form-group full">
                  <label className="form-label" htmlFor="slide-footer">
                    Rodapé da arte
                  </label>
                  <input
                    id="slide-footer"
                    type="text"
                    className="input"
                    value={currentSlide.footer || ''}
                    onChange={(e) => updateCurrentSlide({ footer: e.target.value })}
                  />
                </div>
              </div>
            )}
          </section>

          <aside
            className="card"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}
          >
            <div style={{ width: '100%', textAlign: 'left' }}>
              <h2 className="card-title">Prévia em Tempo Real</h2>
              <p className="card-subtitle">
                Baixe a imagem final em PNG na resolução oficial ({designerAspect} px)
              </p>
            </div>
            <InstagramPostPreview
              slides={designerSlides}
              aspectRatio={designerAspect}
              activeIndex={activeSlideIdx}
              onActiveIndexChange={setActiveSlideIdx}
              size="large"
              showExport
            />
          </aside>
        </div>
      )}

      {/* ================================================================
          ABA 5: BIBLIOTECA DE MÍDIA AUTÊNTICA
         ================================================================ */}
      {!loading && !error && activeTab === 'midia' && (
        <div className="two-col-grid" style={{ alignItems: 'start' }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Biblioteca de Mídia Autêntica ({mediaAssets.length})</h2>
                <p className="card-subtitle">
                  Fotografias autênticas de Jessica têm prioridade automática nos conteúdos de
                  Autoridade Profissional. Imagens de demonstração são sempre identificadas.
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: 14,
              }}
            >
              {mediaAssets.map((asset) => {
                const auth = MEDIA_AUTHENTICITY_META[asset.authenticity];
                const cat = MEDIA_CATEGORY_META[asset.category];
                const isVideo = asset.mimeType.startsWith('video/');
                return (
                  <article
                    key={asset.id}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 14,
                      overflow: 'hidden',
                      background: 'var(--bg-elevated)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        height: 140,
                        background: '#F5F2F8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {isVideo ? (
                        <video
                          src={asset.url}
                          controls
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <img
                          src={asset.url}
                          alt={asset.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit:
                              asset.category === 'logo_marca' ? 'contain' : 'cover',
                            padding: asset.category === 'logo_marca' ? 10 : 0,
                          }}
                        />
                      )}
                    </div>
                    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span className={`badge ${auth.toneClass}`} style={{ fontSize: '0.66rem' }}>
                          {auth.shortLabel}
                        </span>
                        <span className="badge badge-neutral" style={{ fontSize: '0.66rem' }}>
                          {cat.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, lineHeight: 1.3 }}>
                        {asset.name}
                      </div>
                      {asset.notes && (
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                          {asset.notes}
                        </div>
                      )}

                      {/* Associações a Lotes e Conteúdos */}
                      <div
                        style={{
                          marginTop: 4,
                          paddingTop: 6,
                          borderTop: '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 5,
                        }}
                      >
                        <div
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--purple-800)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Link2 size={11} />
                          Vínculos ({asset.linkedBatchIds.length} lotes •{' '}
                          {asset.linkedPostIds.length} posts)
                        </div>

                        {(asset.linkedBatchIds.length > 0 || asset.linkedPostIds.length > 0) && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {asset.linkedBatchIds.map((bId) => {
                              const batchObj = batches.find((b) => b.id === bId);
                              return canManageMedia ? (
                                <button
                                  key={`b-${bId}`}
                                  type="button"
                                  className="badge badge-purple"
                                  style={{
                                    fontSize: '0.64rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                  }}
                                  title="Remover vínculo com este lote"
                                  disabled={linkingAssetId === asset.id}
                                  onClick={() => handleUnlinkMedia(asset.id, { batchId: bId })}
                                >
                                  <span>{batchObj ? batchObj.weekLabel : bId}</span>
                                  <Unlink size={10} />
                                </button>
                              ) : (
                                <span
                                  key={`b-${bId}`}
                                  className="badge badge-purple"
                                  style={{ fontSize: '0.64rem' }}
                                >
                                  {batchObj ? batchObj.weekLabel : bId}
                                </span>
                              );
                            })}
                            {asset.linkedPostIds.map((pId) => {
                              const postObj = posts.find((p) => p.id === pId);
                              return canManageMedia ? (
                                <button
                                  key={`p-${pId}`}
                                  type="button"
                                  className="badge badge-green"
                                  style={{
                                    fontSize: '0.64rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 3,
                                    maxWidth: '100%',
                                  }}
                                  title="Remover vínculo com este conteúdo"
                                  disabled={linkingAssetId === asset.id}
                                  onClick={() => handleUnlinkMedia(asset.id, { postId: pId })}
                                >
                                  <span
                                    style={{
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: 135,
                                    }}
                                  >
                                    {postObj ? `${postObj.dayOfWeek}: ${postObj.title}` : pId}
                                  </span>
                                  <Unlink size={10} />
                                </button>
                              ) : (
                                <span
                                  key={`p-${pId}`}
                                  className="badge badge-green"
                                  style={{ fontSize: '0.64rem', maxWidth: 155, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                >
                                  {postObj ? `${postObj.dayOfWeek}: ${postObj.title}` : pId}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {canManageMedia && (
                        <select
                          aria-label={`Associar ${asset.name} a um conteúdo ou lote`}
                          className="select"
                          style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          defaultValue=""
                          disabled={linkingAssetId === asset.id}
                          onChange={(e) => {
                            const val = e.target.value;
                            e.target.value = '';
                            if (!val) return;
                            if (val.startsWith('batch:')) {
                              handleLinkMedia(asset.id, { batchId: val.slice(6) });
                            } else if (val.startsWith('post:')) {
                              handleLinkMedia(asset.id, { postId: val.slice(5) });
                            }
                          }}
                        >
                          <option value="">+ Associar a conteúdo ou lote...</option>
                          {batches.length > 0 && (
                            <optgroup label="Lotes semanais">
                              {batches.map((b) => (
                                <option key={b.id} value={`batch:${b.id}`}>
                                  {b.weekLabel}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {posts.length > 0 && (
                            <optgroup label="Publicações do lote">
                              {posts.map((p) => (
                                <option key={p.id} value={`post:${p.id}`}>
                                  {p.dayOfWeek} — {p.title.slice(0, 42)}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        )}
                      </div>

                      {canManageMedia && asset.authenticity === 'autentico_jessica' && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost"
                          style={{ marginTop: 'auto', alignSelf: 'flex-end' }}
                          onClick={() => handleDeleteMedia(asset.id)}
                        >
                          <Trash2 size={13} />
                          Remover
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {canManageMedia && (
          <form onSubmit={handleUploadMedia} className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Enviar Material Real de Jessica</h2>
                <p className="card-subtitle">
                  Upload direto de fotos e vídeos (até 50 MB) com associação imediata a lotes ou
                  publicações
                </p>
              </div>
              <Upload size={18} color="var(--purple-600)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="media-category-select">
                  Tipo de material
                </label>
                <select
                  id="media-category-select"
                  className="select"
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value as MediaAssetCategory)}
                >
                  <option value="foto_profissional">Fotografia profissional de Jessica</option>
                  <option value="foto_pessoal">Fotografia pessoal / cotidiano</option>
                  <option value="video">Vídeo gravado por Jessica</option>
                  <option value="logo_marca">Logo oficial da marca</option>
                  <option value="material_existente">Material de marketing existente</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="media-name-input">
                  Nome descritivo
                </label>
                <input
                  id="media-name-input"
                  type="text"
                  className="input"
                  placeholder="Ex.: Retrato Jessica consultório — luz natural"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="media-file-input">
                  Arquivo (JPG, PNG, WEBP, MP4, MOV ou WEBM — até 50 MB)
                </label>
                <input
                  id="media-file-input"
                  type="file"
                  className="input"
                  accept="image/*,video/mp4,video/quicktime,video/webm"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  required
                />
              </div>

              {batches.length > 0 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="media-link-batch">
                    Associar ao lote semanal (opcional)
                  </label>
                  <select
                    id="media-link-batch"
                    className="select"
                    value={uploadLinkBatchId}
                    onChange={(e) => setUploadLinkBatchId(e.target.value)}
                  >
                    <option value="">Sem vínculo com lote</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.status === 'ativo' ? '● Ativo: ' : 'Histórico: '}
                        {b.weekLabel}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {posts.length > 0 && (
                <div className="form-group">
                  <label className="form-label" htmlFor="media-link-post">
                    Associar a uma publicação específica (opcional)
                  </label>
                  <select
                    id="media-link-post"
                    className="select"
                    value={uploadLinkPostId}
                    onChange={(e) => setUploadLinkPostId(e.target.value)}
                  >
                    <option value="">Sem vínculo com conteúdo específico</option>
                    {posts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.dayOfWeek} — {p.title.slice(0, 50)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="media-notes-input">
                  Contexto de uso (opcional)
                </label>
                <textarea
                  id="media-notes-input"
                  className="textarea"
                  style={{ minHeight: 70 }}
                  placeholder="Ex.: Ideal para capa de Reels sobre regulação emocional."
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                id="media-upload-btn"
                className="btn btn-primary"
                disabled={uploadingAsset}
              >
                <Upload size={15} />
                {uploadingAsset ? 'Enviando...' : 'Enviar para Biblioteca'}
              </button>
            </div>
          </form>
          )}
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}

export default function ContentManagementPage() {
  return (
    <Suspense fallback={<LoadingCards count={3} />}>
      <ContentManagementInner />
    </Suspense>
  );
}
