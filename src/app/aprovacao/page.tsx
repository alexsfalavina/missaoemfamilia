'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Check,
  CheckCheck,
  CheckCircle2,
  Copy,
  Edit3,
  Film,
  MessageSquareWarning,
  Target,
  X,
  XCircle,
} from 'lucide-react';
import type { ApprovalStatus, ContentPost } from '@/types/marketing';
import {
  CATEGORY_META,
  FORMAT_META,
  STATUS_META,
  formatPtDate,
} from '@/lib/constants/labels';
import { InstagramPostPreview } from '@/components/InstagramPostPreview';
import {
  EmptyState,
  ErrorBanner,
  HumanSafetyBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';

type FilterTab = 'todos' | ApprovalStatus;

export default function ApprovalCentrePage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('todos');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // Estado para painel inline de Solicitar Alterações ou Rejeitar
  const [activeFeedbackBox, setActiveFeedbackBox] = useState<{
    postId: string;
    mode: 'SOLICITAR_ALTERACOES' | 'REJEITAR';
    text: string;
  } | null>(null);

  // Modal de prévia ampliada
  const [expandedPost, setExpandedPost] = useState<ContentPost | null>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3800);
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/posts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar as publicações da semana.');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar publicações.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const counts = useMemo(() => {
    return {
      todos: posts.length,
      aguardando_aprovacao: posts.filter((p) => p.status === 'aguardando_aprovacao').length,
      aprovado: posts.filter((p) => p.status === 'aprovado').length,
      alteracoes_solicitadas: posts.filter((p) => p.status === 'alteracoes_solicitadas').length,
      rejeitado: posts.filter((p) => p.status === 'rejeitado').length,
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (activeFilter === 'todos') return posts;
    return posts.filter((p) => p.status === activeFilter);
  }, [posts, activeFilter]);

  const reviewedCount = posts.length - counts.aguardando_aprovacao;
  const reviewPercent = posts.length > 0 ? Math.round((reviewedCount / posts.length) * 100) : 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filteredPosts.map((p) => p.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const selectAllPending = () => {
    const pendingIds = posts
      .filter((p) => p.status === 'aguardando_aprovacao')
      .map((p) => p.id);
    setSelectedIds(new Set(pendingIds));
  };

  const submitDecision = async (
    postIds: string[],
    action: 'APROVAR' | 'SOLICITAR_ALTERACOES' | 'REJEITAR',
    feedback?: string
  ) => {
    if (postIds.length === 0) return;

    if (action === 'SOLICITAR_ALTERACOES' && (!feedback || !feedback.trim())) {
      showToast('error', 'Informe brevemente qual ajuste você deseja solicitar.');
      return;
    }

    setBusyIds((prev) => {
      const next = new Set(prev);
      postIds.forEach((id) => next.add(id));
      return next;
    });

    try {
      const res = await fetch('/api/posts/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postIds,
          action,
          feedback: feedback?.trim(),
          actor: 'Jessica Nalin',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível salvar a decisão.');
      }

      const updatedMap = new Map<string, ContentPost>(
        (data.updated as ContentPost[]).map((u) => [u.id, u])
      );

      setPosts((prev) => prev.map((p) => updatedMap.get(p.id) ?? p));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        postIds.forEach((id) => next.delete(id));
        return next;
      });
      setActiveFeedbackBox(null);
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', data.message || 'Decisão registrada com sucesso.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao atualizar publicação.');
    } finally {
      setBusyIds((prev) => {
        const next = new Set(prev);
        postIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleCopyCaption = async (post: ContentPost) => {
    const fullText = `${post.caption}\n\n${post.hashtags.join(' ')}`;
    try {
      await navigator.clipboard.writeText(fullText);
      showToast('info', 'Legenda e hashtags copiadas!');
    } catch {
      showToast('error', 'Não foi possível copiar automaticamente.');
    }
  };

  const allVisibleSelected =
    filteredPosts.length > 0 && filteredPosts.every((p) => selectedIds.has(p.id));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Central de Aprovação</h1>
          <p className="page-description">
            Revise visualmente as {posts.length} publicações preparadas para a próxima semana.
            Aprove individualmente ou em lote em 10 a 15 minutos todo sábado.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/calendario" className="btn btn-secondary">
            <CalendarClock size={16} />
            Ver Calendário ({counts.aprovado} aprovados)
          </Link>
        </div>
      </div>

      <HumanSafetyBanner />

      {/* Progresso da Revisão de Sábado */}
      <section className="card card-compact" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div>
            <strong style={{ fontSize: '0.96rem' }}>
              Progresso da Revisão Semanal: {reviewedCount} de {posts.length} conteúdos decididos
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {counts.aprovado} aprovados • {counts.aguardando_aprovacao} aguardando aprovação •{' '}
              {counts.alteracoes_solicitadas} com ajustes • {counts.rejeitado} rejeitados
            </p>
          </div>
          <span className="badge badge-purple">{reviewPercent}% concluído</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${reviewPercent}%` }} />
        </div>
      </section>

      {/* Filtros por status */}
      <div className="tabs-bar" role="tablist" aria-label="Filtrar publicações por status">
        {(
          [
            { key: 'todos', label: 'Todos', count: counts.todos },
            {
              key: 'aguardando_aprovacao',
              label: 'Aguardando aprovação',
              count: counts.aguardando_aprovacao,
            },
            { key: 'aprovado', label: 'Aprovados', count: counts.aprovado },
            {
              key: 'alteracoes_solicitadas',
              label: 'Alterações solicitadas',
              count: counts.alteracoes_solicitadas,
            },
            { key: 'rejeitado', label: 'Rejeitados', count: counts.rejeitado },
          ] as Array<{ key: FilterTab; label: string; count: number }>
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeFilter === tab.key}
            className={`tab-btn ${activeFilter === tab.key ? 'active' : ''}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            <span>{tab.label}</span>
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Barra de Seleção e Aprovação em Lote */}
      <div className="approval-toolbar">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
          <label className="checkbox-label">
            <input
              type="checkbox"
              className="checkbox-input"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              id="approval-select-all"
            />
            <span>Selecionar visíveis ({filteredPosts.length})</span>
          </label>

          {counts.aguardando_aprovacao > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={selectAllPending}
              id="approval-select-pending"
            >
              Selecionar pendentes ({counts.aguardando_aprovacao})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          {selectedIds.size > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpar seleção
            </button>
          )}
          <button
            type="button"
            id="approval-batch-approve-btn"
            className="btn btn-approve"
            disabled={selectedIds.size === 0 || busyIds.size > 0}
            onClick={() => submitDecision(Array.from(selectedIds), 'APROVAR')}
          >
            <CheckCheck size={17} />
            Aprovar selecionados ({selectedIds.size})
          </button>
        </div>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadPosts} />}
      {loading && <LoadingCards count={3} />}

      {!loading && !error && filteredPosts.length === 0 && (
        <EmptyState
          title="Nenhuma publicação nesta aba"
          description="Altere o filtro acima ou gere um novo lote semanal na aba de Gestão de Conteúdo."
          actionLabel={activeFilter !== 'todos' ? 'Ver todas as publicações' : undefined}
          onAction={activeFilter !== 'todos' ? () => setActiveFilter('todos') : undefined}
        />
      )}

      {!loading && !error && filteredPosts.length > 0 && (
        <div className="approval-list">
          {filteredPosts.map((post, index) => {
            const cat = CATEGORY_META[post.category];
            const fmt = FORMAT_META[post.format];
            const st = STATUS_META[post.status];
            const isSelected = selectedIds.has(post.id);
            const isBusy = busyIds.has(post.id);
            const isFeedbackOpen = activeFeedbackBox?.postId === post.id;

            return (
              <article
                key={post.id}
                id={`approval-card-${post.id}`}
                className={`approval-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="approval-card-grid">
                  {/* Coluna Esquerda: Prévia Visual Instagram */}
                  <div className="approval-preview-col">
                    <InstagramPostPreview
                      slides={post.slides}
                      aspectRatio={post.aspectRatio}
                      showExport
                      onExpand={() => setExpandedPost(post)}
                    />
                  </div>

                  {/* Coluna Direita: Metadados, Legenda e Ações */}
                  <div className="approval-body-col">
                    <div className="approval-card-header">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          className="checkbox-input"
                          checked={isSelected}
                          onChange={() => toggleSelect(post.id)}
                          aria-label={`Selecionar publicação ${post.title}`}
                        />
                        <span style={{ color: 'var(--purple-700)' }}>
                          Publicação #{index + 1} • {post.dayOfWeek}
                        </span>
                      </label>
                      <span className={`badge ${st.toneClass}`}>{st.label}</span>
                    </div>

                    <h2 className="approval-title">{post.title}</h2>

                    {/* Metadados obrigatórios: formato, categoria, data e horário recomendados */}
                    <div className="meta-strip">
                      <span className={`badge ${cat.toneClass}`}>{cat.label}</span>
                      <span className="badge badge-neutral">
                        {fmt.label} ({post.aspectRatio})
                      </span>
                      <span className="badge badge-purple">
                        <CalendarClock size={13} />
                        {formatPtDate(post.recommendedDate)} às {post.recommendedTime}
                      </span>
                    </div>

                    {/* Objetivo de Marketing */}
                    <div className="objective-box">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <Target size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <strong>Objetivo de marketing:</strong> {post.marketingObjective}
                          {post.conversionFocus && (
                            <div style={{ marginTop: 3, fontSize: '0.8rem', opacity: 0.9 }}>
                              <strong>Foco em clientes:</strong> {post.conversionFocus}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Legenda */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span className="form-label">Legenda preparada</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => handleCopyCaption(post)}
                          >
                            <Copy size={13} />
                            Copiar texto
                          </button>
                          <Link
                            href={`/conteudo?edit=${post.id}`}
                            className="btn btn-sm btn-ghost"
                          >
                            <Edit3 size={13} />
                            Editar no Criador
                          </Link>
                        </div>
                      </div>
                      <div className="caption-box">{post.caption}</div>
                    </div>

                    {/* Roteiro resumido para Reels */}
                    {post.reelsScript && post.reelsScript.length > 0 && (
                      <div
                        style={{
                          background: 'var(--green-50)',
                          border: '1px solid var(--green-200)',
                          borderRadius: 12,
                          padding: '10px 14px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--green-800)',
                            marginBottom: 6,
                          }}
                        >
                          <Film size={14} />
                          Roteiro de Reels ({post.reelsScript.length} cenas)
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {post.reelsScript.map((scene) => (
                            <div
                              key={scene.id}
                              style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                            >
                              <strong>{scene.timeRange}:</strong> “{scene.spokenLine}”
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTA + Hashtags */}
                    <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                      <strong>Chamada para ação (CTA):</strong> {post.cta}
                    </div>

                    <div className="hashtags-row">
                      {post.hashtags.map((tag) => (
                        <span key={tag} className="hashtag-chip">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Feedback registrado anteriormente */}
                    {post.approvalFeedback && (
                      <div className="feedback-recorded">
                        <strong>Observação registrada:</strong> {post.approvalFeedback}
                      </div>
                    )}

                    {/* Painel inline para Solicitar Alterações ou Rejeitar */}
                    {isFeedbackOpen && activeFeedbackBox && (
                      <div className="feedback-inline-panel">
                        <label
                          className="form-label"
                          htmlFor={`feedback-input-${post.id}`}
                        >
                          {activeFeedbackBox.mode === 'SOLICITAR_ALTERACOES'
                            ? 'Descreva o ajuste desejado (obrigatório):'
                            : 'Motivo da rejeição (opcional):'}
                        </label>
                        <textarea
                          id={`feedback-input-${post.id}`}
                          className="textarea"
                          style={{ minHeight: 74 }}
                          placeholder={
                            activeFeedbackBox.mode === 'SOLICITAR_ALTERACOES'
                              ? 'Ex.: Deixar o tom da legenda mais acolhedor no início e mencionar a turma de dezembro.'
                              : 'Ex.: Tema já abordado recentemente.'
                          }
                          value={activeFeedbackBox.text}
                          onChange={(e) =>
                            setActiveFeedbackBox({
                              ...activeFeedbackBox,
                              text: e.target.value,
                            })
                          }
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-secondary"
                            onClick={() => setActiveFeedbackBox(null)}
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            className={`btn btn-sm ${
                              activeFeedbackBox.mode === 'SOLICITAR_ALTERACOES'
                                ? 'btn-primary'
                                : 'btn-reject'
                            }`}
                            disabled={isBusy}
                            onClick={() =>
                              submitDecision(
                                [post.id],
                                activeFeedbackBox.mode,
                                activeFeedbackBox.text
                              )
                            }
                          >
                            {activeFeedbackBox.mode === 'SOLICITAR_ALTERACOES'
                              ? 'Confirmar pedido de alteração'
                              : 'Confirmar rejeição'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 3 Botões Principais de Ação */}
                    <div className="approval-actions-bar">
                      <button
                        type="button"
                        id={`btn-aprovar-${post.id}`}
                        className="btn btn-approve"
                        disabled={isBusy || post.status === 'aprovado'}
                        onClick={() => submitDecision([post.id], 'APROVAR')}
                      >
                        {post.status === 'aprovado' ? (
                          <>
                            <CheckCircle2 size={16} />
                            Aprovado
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            APROVAR
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        id={`btn-alteracoes-${post.id}`}
                        className="btn btn-changes"
                        disabled={isBusy}
                        onClick={() =>
                          setActiveFeedbackBox({
                            postId: post.id,
                            mode: 'SOLICITAR_ALTERACOES',
                            text: post.approvalFeedback || '',
                          })
                        }
                      >
                        <MessageSquareWarning size={16} />
                        SOLICITAR ALTERAÇÕES
                      </button>

                      <button
                        type="button"
                        id={`btn-rejeitar-${post.id}`}
                        className="btn btn-reject"
                        disabled={isBusy}
                        onClick={() =>
                          setActiveFeedbackBox({
                            postId: post.id,
                            mode: 'REJEITAR',
                            text: '',
                          })
                        }
                      >
                        <XCircle size={16} />
                        REJEITAR
                      </button>

                      {post.approvedAt && post.status === 'aprovado' && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '0.76rem',
                            color: 'var(--green-800)',
                            fontWeight: 600,
                          }}
                        >
                          Aprovado por {post.approvedBy || 'Jessica Nalin'} • Sem publicação automática
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Prévia Ampliada */}
      {expandedPost && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Prévia ampliada da publicação"
          onClick={() => setExpandedPost(null)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <h2 className="card-title">{expandedPost.title}</h2>
                <p className="card-subtitle">
                  {FORMAT_META[expandedPost.format].dimensionsLabel} •{' '}
                  {formatPtDate(expandedPost.recommendedDate)} às {expandedPost.recommendedTime}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setExpandedPost(null)}
                aria-label="Fechar prévia"
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10px 0 18px',
              }}
            >
              <InstagramPostPreview
                slides={expandedPost.slides}
                aspectRatio={expandedPost.aspectRatio}
                size="large"
                showExport
              />
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}
