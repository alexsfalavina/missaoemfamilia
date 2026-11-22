'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Lock,
  Save,
  X,
} from 'lucide-react';
import type { ContentPost } from '@/types/marketing';
import {
  CATEGORY_META,
  FORMAT_META,
  STATUS_META,
  WEEKDAYS_PT,
  formatPtDate,
  formatPtDateShort,
} from '@/lib/constants/labels';
import { InstagramPostPreview } from '@/components/InstagramPostPreview';
import {
  EmptyState,
  ErrorBanner,
  HumanSafetyBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';

export default function EditorialCalendarPage() {
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPendingToo, setShowPendingToo] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3600);
  };

  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/posts', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar o calendário editorial.');
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o calendário.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const approvedCount = useMemo(
    () => posts.filter((p) => p.status === 'aprovado').length,
    [posts]
  );

  const visiblePosts = useMemo(() => {
    return posts.filter((p) => {
      if (p.status === 'aprovado') return true;
      if (showPendingToo && p.status !== 'rejeitado') return true;
      return false;
    });
  }, [posts, showPendingToo]);

  // Agrupa os 7 dias da semana
  const weekColumns = useMemo(() => {
    return WEEKDAYS_PT.map((dayName) => {
      const items = visiblePosts.filter((p) => p.dayOfWeek === dayName);
      const sampleDate = items[0]?.recommendedDate ?? null;
      return {
        dayName,
        sampleDate,
        items,
      };
    });
  }, [visiblePosts]);

  const openPostModal = (post: ContentPost) => {
    setSelectedPost(post);
    setEditDate(post.recommendedDate);
    setEditTime(post.recommendedTime);
  };

  const handleSaveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;
    setSavingSchedule(true);
    try {
      const res = await fetch(`/api/posts/${selectedPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendedDate: editDate,
          recommendedTime: editTime,
          auditNote: `Horário ajustado no Calendário Editorial para ${formatPtDate(editDate)} às ${editTime}.`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao reagendar.');

      setPosts((prev) => prev.map((p) => (p.id === selectedPost.id ? data.post : p)));
      setSelectedPost(data.post);
      showToast('success', 'Data e horário atualizados no calendário.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar horário.');
    } finally {
      setSavingSchedule(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Calendário Editorial</h1>
          <p className="page-description">
            Visualize os conteúdos aprovados e organizados ao longo dos 7 dias da semana. Clique em
            qualquer publicação para ajustar data ou horário.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/aprovacao" className="btn btn-primary">
            <CheckCircle2 size={16} />
            Ir para Central de Aprovação
          </Link>
        </div>
      </div>

      <HumanSafetyBanner />

      {/* Barra de Controle */}
      <div className="approval-toolbar">
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14 }}>
          <span className="badge badge-green">
            <CheckCircle2 size={13} />
            {approvedCount} aprovados e agendados localmente
          </span>
          <span className="badge badge-neutral">
            <Lock size={13} />
            Publicação automática no Instagram desativada (Etapa 1)
          </span>
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            className="checkbox-input"
            checked={showPendingToo}
            onChange={(e) => setShowPendingToo(e.target.checked)}
            id="calendar-toggle-pending"
          />
          <span>Mostrar também conteúdos aguardando aprovação</span>
        </label>
      </div>

      {error && <ErrorBanner message={error} onRetry={loadPosts} />}
      {loading && <LoadingCards count={4} />}

      {!loading && !error && visiblePosts.length === 0 && (
        <EmptyState
          title="Nenhum conteúdo aprovado no calendário ainda"
          description="Aprove publicações na Central de Aprovação para vê-las agendadas automaticamente aqui."
          actionLabel="Abrir Central de Aprovação"
          onAction={() => {
            window.location.href = '/aprovacao';
          }}
        />
      )}

      {!loading && !error && visiblePosts.length > 0 && (
        <section className="calendar-grid" aria-label="Calendário semanal de publicações">
          {weekColumns.map((col) => (
            <div key={col.dayName} className="calendar-day-col">
              <div className="calendar-day-header">
                <span className="calendar-day-name">{col.dayName.replace('-feira', '')}</span>
                <span className="calendar-day-date">
                  {col.sampleDate ? formatPtDateShort(col.sampleDate) : 'Sem post'}
                </span>
              </div>

              <div className="calendar-day-body">
                {col.items.length === 0 ? (
                  <div
                    style={{
                      margin: 'auto',
                      textAlign: 'center',
                      fontSize: '0.76rem',
                      color: 'var(--text-muted)',
                      padding: 8,
                    }}
                  >
                    Livre
                  </div>
                ) : (
                  col.items.map((post) => {
                    const cat = CATEGORY_META[post.category];
                    const fmt = FORMAT_META[post.format];
                    const st = STATUS_META[post.status];
                    return (
                      <button
                        key={post.id}
                        type="button"
                        className={`calendar-event-card ${
                          post.status === 'aprovado' ? 'approved' : 'pending'
                        }`}
                        onClick={() => openPostModal(post)}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              color: 'var(--purple-800)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Clock size={12} />
                            {post.recommendedTime}
                          </span>
                          <span className={`badge ${st.toneClass}`} style={{ fontSize: '0.66rem', padding: '2px 7px' }}>
                            {st.shortLabel}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3,
                          }}
                        >
                          {post.title}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          <span className={`badge ${cat.toneClass}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            {cat.shortLabel}
                          </span>
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                            {fmt.label}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Modal de Inspeção e Reagendamento */}
      {selectedPost && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Detalhes do agendamento"
          onClick={() => setSelectedPost(null)}
        >
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="meta-strip" style={{ marginBottom: 6 }}>
                  <span className={`badge ${STATUS_META[selectedPost.status].toneClass}`}>
                    {STATUS_META[selectedPost.status].label}
                  </span>
                  <span className={`badge ${CATEGORY_META[selectedPost.category].toneClass}`}>
                    {CATEGORY_META[selectedPost.category].label}
                  </span>
                  <span className="badge badge-neutral">
                    {FORMAT_META[selectedPost.format].label}
                  </span>
                </div>
                <h2 className="card-title">{selectedPost.title}</h2>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setSelectedPost(null)}
                aria-label="Fechar detalhes"
              >
                <X size={18} />
              </button>
            </div>

            <div className="two-col-grid" style={{ alignItems: 'start' }}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <InstagramPostPreview
                  slides={selectedPost.slides}
                  aspectRatio={selectedPost.aspectRatio}
                  showExport
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="objective-box">
                  <strong>Objetivo:</strong> {selectedPost.marketingObjective}
                </div>

                <form onSubmit={handleSaveReschedule} className="card card-compact">
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontWeight: 700,
                      fontSize: '0.88rem',
                      marginBottom: 12,
                    }}
                  >
                    <CalendarDays size={16} />
                    Ajustar data e horário recomendados
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="cal-edit-date">
                        Data
                      </label>
                      <input
                        id="cal-edit-date"
                        type="date"
                        className="input"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="cal-edit-time">
                        Horário
                      </label>
                      <input
                        id="cal-edit-time"
                        type="time"
                        className="input"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary"
                      disabled={savingSchedule}
                    >
                      <Save size={14} />
                      {savingSchedule ? 'Salvando...' : 'Salvar horário'}
                    </button>
                    <Link
                      href={`/conteudo?edit=${selectedPost.id}`}
                      className="btn btn-sm btn-secondary"
                    >
                      <Edit3 size={14} />
                      Editar conteúdo
                    </Link>
                  </div>
                </form>

                <div className="caption-box">{selectedPost.caption}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastMessage toast={toast} />
    </div>
  );
}
