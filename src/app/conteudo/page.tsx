'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckSquare,
  Edit3,
  Layers,
  Palette,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  Wand2,
} from 'lucide-react';
import type {
  AspectRatioSpec,
  CarouselSlide,
  ContentCategory,
  ContentFormat,
  ContentPost,
  DesignTemplateId,
} from '@/types/marketing';
import {
  CATEGORY_META,
  FORMAT_META,
  STATUS_META,
  TEMPLATE_META,
  formatPtDate,
} from '@/lib/constants/labels';
import { InstagramPostPreview } from '@/components/InstagramPostPreview';
import {
  DemoDataBanner,
  ErrorBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';

type ContentTab = 'estrategia' | 'criador' | 'designer';

const MEDIA_LIBRARY = [
  { label: 'Sem foto (Tipográfico)', url: '' },
  { label: 'Retrato Jessica Nalin', url: '/brand/jessica-portrait.jpg' },
  { label: 'Mãe e filha (Conexão)', url: '/media/family-connection.jpg' },
  { label: 'Pais lendo com filhos', url: '/media/parents-reading.jpg' },
  { label: 'Diário & Chá (Calma)', url: '/media/calm-journal.jpg' },
];

function ContentManagementInner() {
  const searchParams = useSearchParams();
  const initialEditId = searchParams.get('edit');

  const [activeTab, setActiveTab] = useState<ContentTab>(
    initialEditId ? 'criador' : 'estrategia'
  );
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  // Tab 1: Estratégia Semanal IA
  const [focusTheme, setFocusTheme] = useState('');
  const [weekStartDate, setWeekStartDate] = useState('2026-11-23');
  const [generatingWeek, setGeneratingWeek] = useState(false);

  // Tab 2: Criador / Editor de Conteúdo
  const [editingId, setEditingId] = useState<string | null>(initialEditId);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ContentCategory>('educativo');
  const [formFormat, setFormFormat] = useState<ContentFormat>('carrossel');
  const [formObjective, setFormObjective] = useState('');
  const [formConversion, setFormConversion] = useState('');
  const [formCaption, setFormCaption] = useState('');
  const [formHashtags, setFormHashtags] = useState('#educacaoparental #metodoalma #missaoemfamilia');
  const [formCta, setFormCta] = useState(
    'Comente "ALMA" ou clique no link da bio para conhecer a Mentoria.'
  );
  const [formDate, setFormDate] = useState('2026-11-26');
  const [formTime, setFormTime] = useState('19:00');
  const [savingPost, setSavingPost] = useState(false);

  // Tab 3: Designer IA
  const [designerPostId, setDesignerPostId] = useState<string>('');
  const [designerSlides, setDesignerSlides] = useState<CarouselSlide[]>([]);
  const [designerAspect, setDesignerAspect] = useState<AspectRatioSpec>('1080x1350');
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [savingDesign, setSavingDesign] = useState(false);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3800);
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/posts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar os conteúdos.');
      const data = await res.json();
      const fetched: ContentPost[] = data.posts || [];
      setPosts(fetched);

      if (fetched.length > 0) {
        const targetDesign =
          fetched.find((p) => p.id === designerPostId) ??
          fetched.find((p) => p.id === initialEditId) ??
          fetched[0];
        setDesignerPostId(targetDesign.id);
        setDesignerSlides(targetDesign.slides);
        setDesignerAspect(targetDesign.aspectRatio);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar conteúdos.');
    } finally {
      setLoading(false);
    }
  }, [designerPostId, initialEditId]);

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const populateCreatorFromPost = useCallback((post: ContentPost) => {
    setEditingId(post.id);
    setFormTitle(post.title);
    setFormCategory(post.category);
    setFormFormat(post.format);
    setFormObjective(post.marketingObjective);
    setFormConversion(post.conversionFocus);
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
    setFormFormat('carrossel');
    setFormObjective('');
    setFormConversion('');
    setFormCaption('');
    setFormHashtags('#educacaoparental #metodoalma #missaoemfamilia #jessicanalin');
    setFormCta('Comente "ALMA" para receber o convite da Mentoria no Direct.');
    setFormDate('2026-11-26');
    setFormTime('19:00');
  };

  // Distribuição das 5 categorias na estratégia semanal
  const categoryBreakdown = useMemo(() => {
    const keys: ContentCategory[] = [
      'educativo',
      'emocional',
      'autoridade',
      'engajamento',
      'comercial',
    ];
    return keys.map((cat) => ({
      cat,
      meta: CATEGORY_META[cat],
      count: posts.filter((p) => p.category === cat).length,
    }));
  }, [posts]);

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
      setPosts(data.posts || []);
      if (data.posts?.[0]) {
        setDesignerPostId(data.posts[0].id);
        setDesignerSlides(data.posts[0].slides);
        setDesignerAspect(data.posts[0].aspectRatio);
      }
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', data.message || 'Novo plano semanal de 7 ideias gerado!');
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

    try {
      if (editingId) {
        const res = await fetch(`/api/posts/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle,
            category: formCategory,
            format: formFormat,
            marketingObjective: formObjective,
            conversionFocus: formConversion,
            caption: formCaption,
            hashtags: parsedTags,
            cta: formCta,
            recommendedDate: formDate,
            recommendedTime: formTime,
            returnToApproval: true,
            auditNote: 'Conteúdo editado no Criador de Conteúdo e reenviado para aprovação.',
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
          body: JSON.stringify({
            title: formTitle,
            category: formCategory,
            format: formFormat,
            marketingObjective: formObjective,
            conversionFocus: formConversion,
            caption: formCaption,
            hashtags: parsedTags,
            cta: formCta,
            recommendedDate: formDate,
            recommendedTime: formTime,
          }),
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
      showToast('error', 'Digite um tema no campo Título para a IA montar o rascunho completo.');
      return;
    }
    setSavingPost(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate',
          topic: formTitle,
          category: formCategory,
          format: formFormat,
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
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', 'Conteúdo completo (slides + legenda + CTA) gerado em modo demo!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao gerar rascunho.');
    } finally {
      setSavingPost(false);
    }
  };

  // Designer IA helpers
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
      body: 'Escreva aqui uma orientação acolhedora, clara e fácil de aplicar hoje.',
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Gestão de Conteúdo & Designer IA</h1>
          <p className="page-description">
            Planeje as 7 publicações da semana focadas em atrair clientes, edite legendas ou crie
            artes prontas para Instagram em 1080×1350 e 1080×1920.
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
          Estratégia Semanal IA
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
          id="tab-designer"
          aria-selected={activeTab === 'designer'}
          className={`tab-btn ${activeTab === 'designer' ? 'active' : ''}`}
          onClick={() => setActiveTab('designer')}
        >
          <Palette size={15} />
          Designer IA (1080px)
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadPosts} />}
      {loading && <LoadingCards count={3} />}

      {/* ================================================================
          ABA 1: ESTRATÉGIA SEMANAL IA (7 IDEIAS DE CONVERSÃO)
         ================================================================ */}
      {!loading && !error && activeTab === 'estrategia' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Gerador de Estratégia Semanal (7 Publicações)</h2>
                <p className="card-subtitle">
                  Equilibra os 5 pilares priorizando atração de pais qualificados e pedidos de
                  mentoria — sem custo de API externa nesta etapa.
                </p>
              </div>
              <span className="badge badge-green">Foco em Clientes</span>
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
                  Tema central da semana (opcional)
                </label>
                <input
                  id="strategy-theme"
                  type="text"
                  className="input"
                  placeholder="Ex.: Rotina sem telas, Limites nas férias, Método ALMA..."
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

              <button
                type="submit"
                id="strategy-generate-btn"
                className="btn btn-primary"
                disabled={generatingWeek}
              >
                <Sparkles size={16} />
                {generatingWeek ? 'Gerando 7 ideias...' : 'Gerar novo plano semanal'}
              </button>
            </form>
          </section>

          {/* Distribuição das 5 Categorias */}
          <div className="kpi-grid" style={{ marginBottom: 0 }}>
            {categoryBreakdown.map(({ cat, meta, count }) => (
              <div key={cat} className="card card-compact">
                <div className="meta-strip" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span className={`badge ${meta.toneClass}`}>{meta.shortLabel}</span>
                  <strong style={{ fontSize: '1.15rem' }}>{count}</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {meta.description}
                </p>
              </div>
            ))}
          </div>

          {/* Lista das 7 Ideias Atuais */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Plano Semanal Atual ({posts.length} conteúdos)</h2>
                <p className="card-subtitle">
                  Cada conteúdo tem objetivo claro de marketing e conversão
                </p>
              </div>
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
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div className="meta-strip" style={{ marginBottom: 6 }}>
                      <strong style={{ fontSize: '0.8rem', color: 'var(--purple-800)' }}>
                        Dia {idx + 1} • {post.dayOfWeek} ({formatPtDate(post.recommendedDate)} às{' '}
                        {post.recommendedTime})
                      </strong>
                      <span className={`badge ${CATEGORY_META[post.category].toneClass}`}>
                        {CATEGORY_META[post.category].label}
                      </span>
                      <span className="badge badge-neutral">
                        {FORMAT_META[post.format].label}
                      </span>
                      <span className={`badge ${STATUS_META[post.status].toneClass}`}>
                        {STATUS_META[post.status].shortLabel}
                      </span>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.96rem', marginBottom: 4 }}>
                      {post.title}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <Target size={13} style={{ display: 'inline', marginRight: 5 }} />
                      <strong>Objetivo:</strong> {post.marketingObjective}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        populateCreatorFromPost(post);
                        setActiveTab('criador');
                      }}
                    >
                      <Edit3 size={14} />
                      Editar texto
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        selectDesignerPost(post.id);
                        setActiveTab('designer');
                      }}
                    >
                      <Palette size={14} />
                      Abrir arte
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ================================================================
          ABA 2: CRIADOR & EDITOR DE CONTEÚDO
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
                  Carrosséis, Roteiros de Reels, Posts Únicos e Stories com CTA estratégico
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
                  placeholder="Ex.: Como lidar com respostas atravessadas sem perder a firmeza"
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
                <label className="form-label" htmlFor="creator-category">
                  Categoria estratégica
                </label>
                <select
                  id="creator-category"
                  className="select"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ContentCategory)}
                >
                  <option value="educativo">Educativo</option>
                  <option value="emocional">Emocional</option>
                  <option value="autoridade">Construção de Autoridade</option>
                  <option value="engajamento">Engajamento</option>
                  <option value="comercial">Comercial (Conversão)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="creator-date">
                  Data recomendada
                </label>
                <input
                  id="creator-date"
                  type="date"
                  className="input"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="creator-time">
                  Horário recomendado
                </label>
                <input
                  id="creator-time"
                  type="time"
                  className="input"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-objective">
                  Objetivo de marketing (obrigatório para cada conteúdo)
                </label>
                <input
                  id="creator-objective"
                  type="text"
                  className="input"
                  placeholder="Ex.: Gerar salvamentos qualificados e conversas no Direct para Mentoria"
                  value={formObjective}
                  onChange={(e) => setFormObjective(e.target.value)}
                  required
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
                  placeholder="Escreva a legenda ou clique em 'Gerar rascunho completo com IA (Demo)'..."
                  value={formCaption}
                  onChange={(e) => setFormCaption(e.target.value)}
                  required
                />
              </div>

              <div className="form-group full">
                <label className="form-label" htmlFor="creator-cta">
                  Chamada para ação (CTA)
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
                  Hashtags (separadas por espaço)
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
                  Gerar rascunho completo com IA (Demo)
                </button>
              )}
            </div>
          </form>

          <aside className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Publicações Existentes</h2>
                <p className="card-subtitle">Clique para carregar e editar</p>
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
                    <span className={`badge ${STATUS_META[post.status].toneClass}`} style={{ fontSize: '0.68rem' }}>
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
          ABA 3: DESIGNER IA (ESTÚDIO VISUAL 1080×1350 E 1080×1920)
         ================================================================ */}
      {!loading && !error && activeTab === 'designer' && (
        <div className="two-col-grid" style={{ alignItems: 'start' }}>
          {/* Painel de Edição do Slide */}
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Estúdio Visual — Identidade Jessica Nalin</h2>
                <p className="card-subtitle">
                  Suporta 1080×1350 (Feed), 1080×1920 (Stories/Reels) e carrosséis multi-slide
                </p>
              </div>
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

            {/* Gerenciador de Slides */}
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
              <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
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
                  Remover slide
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
                    Fotografia de fundo
                  </label>
                  <select
                    id="slide-image"
                    className="select"
                    value={currentSlide.imageUrl || ''}
                    onChange={(e) =>
                      updateCurrentSlide({ imageUrl: e.target.value || undefined })
                    }
                  >
                    {MEDIA_LIBRARY.map((m) => (
                      <option key={m.label} value={m.url}>
                        {m.label}
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

          {/* Prévia em Tempo Real + Exportação PNG */}
          <aside className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
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
