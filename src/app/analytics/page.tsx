'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bookmark,
  Eye,
  MessageCircle,
  Plus,
  Share2,
  Trash2,
  TrendingUp,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type {
  AnalyticsReport,
  LeadInterestType,
  LeadStage,
  PotentialCustomerLead,
} from '@/types/marketing';
import {
  LEAD_INTEREST_META,
  LEAD_STAGE_META,
  formatNumberPt,
} from '@/lib/constants/labels';
import {
  DemoDataBanner,
  EmptyState,
  ErrorBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface AnalyticsPayload {
  report: AnalyticsReport;
  leads: PotentialCustomerLead[];
  leadStats: {
    total: number;
    mentoria: number;
    avaliacao_familiar: number;
    informacao: number;
    byPost: Array<{ postId: string; postTitle: string; format: string; count: number }>;
  };
  posts: Array<{ id: string; title: string; dayOfWeek: string; format: string }>;
}

export default function AnalyticsPage() {
  const { canManageLeads } = useCurrentUser();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulário de registro real de interessados (nunca inventa leads)
  const [contactName, setContactName] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [interestType, setInterestType] = useState<LeadInterestType>('mentoria');
  const [sourcePostId, setSourcePostId] = useState('');
  const [channel, setChannel] = useState<PotentialCustomerLead['channel']>('direct');
  const [notes, setNotes] = useState('');
  const [savingLead, setSavingLead] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3600);
  };

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar os relatórios.');
      const payload = (await res.json()) as AnalyticsPayload;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar métricas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim()) {
      showToast('error', 'Informe o nome da pessoa interessada.');
      return;
    }
    setSavingLead(true);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName,
          instagramHandle,
          interestType,
          sourcePostId: sourcePostId || undefined,
          channel,
          notes,
        }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Erro ao registrar interessado.');
      setContactName('');
      setInstagramHandle('');
      setNotes('');
      await loadAnalytics();
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', resData.message || 'Interessado real registrado!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar contato.');
    } finally {
      setSavingLead(false);
    }
  };

  const handleStageChange = async (id: string, stage: LeadStage) => {
    try {
      const res = await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar estágio.');
      await loadAnalytics();
      showToast('success', 'Estágio comercial atualizado.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao atualizar.');
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const res = await fetch(`/api/leads?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover registro.');
      await loadAnalytics();
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('info', 'Registro removido.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao remover.');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Analytics & Inteligência Comercial</h1>
        </div>
        <LoadingCards count={7} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <div className="page-header">
          <h1>Analytics & Inteligência Comercial</h1>
        </div>
        <ErrorBanner message={error || 'Relatório indisponível.'} onRetry={loadAnalytics} />
      </div>
    );
  }

  const { report, leads, leadStats, posts } = data;
  const maxDailyReach = Math.max(...report.dailyTrend.map((d) => d.reach), 1);

  const metricCards = [
    { label: 'Alcance', value: report.summary.reach, icon: Eye, tone: '', isReal: false },
    { label: 'Compartilhamentos', value: report.summary.shares, icon: Share2, tone: '', isReal: false },
    { label: 'Salvamentos', value: report.summary.saves, icon: Bookmark, tone: 'green', isReal: false },
    { label: 'Comentários', value: report.summary.comments, icon: MessageCircle, tone: '', isReal: false },
    { label: 'Visitas ao perfil', value: report.summary.profileVisits, icon: TrendingUp, tone: '', isReal: false },
    { label: 'Novos seguidores', value: report.summary.newFollowers, icon: UserPlus, tone: 'green', isReal: false },
    {
      label: 'Interessados reais',
      value: leadStats.total,
      icon: UserCheck,
      tone: 'green',
      highlight: true,
      isReal: true,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics & Inteligência Comercial</h1>
          <p className="page-description">
            Relatórios do perfil{' '}
            <a
              href={report.instagramUrl || 'https://www.instagram.com/eujessynalin/'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--purple-700)', fontWeight: 700 }}
            >
              {report.instagramHandle || '@eujessynalin'}
            </a>
            : métricas demonstrativas separadas claramente do acompanhamento real de interessados.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-purple">{report.instagramHandle || '@eujessynalin'}</span>
          <span className="badge badge-gold">{report.periodLabel}</span>
        </div>
      </div>

      <DemoDataBanner />

      {/* 7 Métricas Principais */}
      <section className="kpi-grid" aria-label="Indicadores de desempenho">
        {metricCards.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className={`kpi-card ${item.highlight ? 'kpi-card-green' : ''}`}
            >
              <div className="kpi-top">
                <span className="kpi-label">{item.label}</span>
                <span className={`kpi-icon-wrap ${item.tone}`}>
                  <Icon size={17} />
                </span>
              </div>
              <div className="kpi-value">{formatNumberPt(item.value)}</div>
              <div className="kpi-meta">
                <span>{item.isReal ? 'Registros reais da equipe' : 'Últimos 7 dias'}</span>
                {item.isReal ? (
                  <span className="badge badge-green" style={{ fontSize: '0.66rem', padding: '2px 7px' }}>
                    Real
                  </span>
                ) : (
                  <span className="demo-micro-tag">Demo</span>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {/* ================================================================
          INTELIGÊNCIA COMERCIAL — RASTREAMENTO REAL DE INTERESSADOS
         ================================================================ */}
      <section className="card" style={{ marginBottom: 22 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">
              Inteligência Comercial — Acompanhamento Real de Interessados
            </h2>
            <p className="card-subtitle">
              Registre apenas contatos reais recebidos no Direct, comentários ou WhatsApp — a
              plataforma nunca inventa leads ou conversões.
            </p>
          </div>
          <span className="badge badge-green">Zero Leads Fictícios</span>
        </div>

        {/* 3 Categorias Comerciais */}
        <div className="kpi-grid" style={{ marginBottom: 18 }}>
          <div className="card card-compact" style={{ background: 'var(--purple-50)' }}>
            <div className="kpi-label">Interessados em Mentoria</div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', marginTop: 4 }}>
              {leadStats.mentoria}
            </div>
          </div>
          <div className="card card-compact" style={{ background: 'var(--green-50)' }}>
            <div className="kpi-label">Interessados em Avaliação Familiar</div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', marginTop: 4 }}>
              {leadStats.avaliacao_familiar}
            </div>
          </div>
          <div className="card card-compact" style={{ background: 'var(--bg-subtle)' }}>
            <div className="kpi-label">Pedidos de Informação</div>
            <div className="kpi-value" style={{ fontSize: '1.5rem', marginTop: 4 }}>
              {leadStats.informacao}
            </div>
          </div>
        </div>

        <div className="two-col-grid" style={{ alignItems: 'start' }}>
          {/* Lista de Interessados Reais */}
          <div>
            {leads.length === 0 ? (
              <EmptyState
                title="Nenhum interessado real registrado ainda"
                description="Quando uma mãe ou pai enviar mensagem pedindo informações sobre Mentoria ou Avaliação Familiar, registre ao lado vinculando à publicação de origem."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leads.map((lead) => {
                  const intMeta = LEAD_INTEREST_META[lead.interestType];
                  return (
                    <div
                      key={lead.id}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 12,
                        padding: '12px 14px',
                        background: 'var(--bg-elevated)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div className="meta-strip" style={{ marginBottom: 4 }}>
                          <strong style={{ fontSize: '0.9rem' }}>{lead.contactName}</strong>
                          {lead.instagramHandle && (
                            <span style={{ fontSize: '0.78rem', color: 'var(--purple-700)' }}>
                              {lead.instagramHandle}
                            </span>
                          )}
                          <span className={`badge ${intMeta.toneClass}`}>{intMeta.shortLabel}</span>
                          <span className="badge badge-neutral">{lead.channel}</span>
                        </div>
                        {lead.sourcePostTitle && (
                          <div style={{ fontSize: '0.77rem', color: 'var(--text-secondary)' }}>
                            <strong>Origem:</strong> {lead.sourcePostTitle}
                          </div>
                        )}
                        {lead.notes && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {lead.notes}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {canManageLeads ? (
                          <>
                            <select
                              className="select"
                              style={{ width: 165, padding: '6px 10px', fontSize: '0.78rem' }}
                              value={lead.stage}
                              onChange={(e) => handleStageChange(lead.id, e.target.value as LeadStage)}
                              aria-label={`Estágio de ${lead.contactName}`}
                            >
                              {(Object.keys(LEAD_STAGE_META) as LeadStage[]).map((st) => (
                                <option key={st} value={st}>
                                  {LEAD_STAGE_META[st].label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleDeleteLead(lead.id)}
                              aria-label={`Remover ${lead.contactName}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        ) : (
                          <span className="badge badge-neutral">
                            {LEAD_STAGE_META[lead.stage].label}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Formulário: Registrar Interessado Real */}
          {canManageLeads && (
          <form
            onSubmit={handleAddLead}
            className="card card-compact"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '0.92rem' }}>
              Registrar interessado real
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="lead-name">
                  Nome da pessoa
                </label>
                <input
                  id="lead-name"
                  className="input"
                  placeholder="Ex.: Mariana S."
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lead-handle">
                  Instagram (opcional)
                </label>
                <input
                  id="lead-handle"
                  className="input"
                  placeholder="@usuario"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lead-interest">
                  Tipo de interesse
                </label>
                <select
                  id="lead-interest"
                  className="select"
                  value={interestType}
                  onChange={(e) => setInterestType(e.target.value as LeadInterestType)}
                >
                  <option value="mentoria">Interesse em Mentoria Familiar</option>
                  <option value="avaliacao_familiar">Interesse em Avaliação Familiar</option>
                  <option value="informacao">Pedido de Informação</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lead-post">
                  Publicação de origem
                </label>
                <select
                  id="lead-post"
                  className="select"
                  value={sourcePostId}
                  onChange={(e) => setSourcePostId(e.target.value)}
                >
                  <option value="">Contato direto / sem post específico</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.dayOfWeek} — {p.title.slice(0, 48)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lead-channel">
                  Canal do contato
                </label>
                <select
                  id="lead-channel"
                  className="select"
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as PotentialCustomerLead['channel'])
                  }
                >
                  <option value="direct">Direct do Instagram</option>
                  <option value="comentario">Comentário na publicação</option>
                  <option value="link_bio">Link na bio</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="lead-notes">
                  Observação (opcional)
                </label>
                <input
                  id="lead-notes"
                  className="input"
                  placeholder="Ex.: Filhos de 5 e 8 anos, perguntou sobre horários"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                id="lead-submit-btn"
                className="btn btn-primary"
                disabled={savingLead}
              >
                <Plus size={15} />
                {savingLead ? 'Registrando...' : 'Registrar interessado'}
              </button>
            </div>
          </form>
          )}
        </div>

        {/* Leads Reais por Publicação Individual */}
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.9rem' }}>
            Interessados reais por publicação individual
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Publicação</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>Formato</th>
                  <th style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>
                    Interessados reais registrados
                  </th>
                </tr>
              </thead>
              <tbody>
                {leadStats.byPost.map((row) => (
                  <tr key={row.postId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{row.postTitle}</td>
                    <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{row.format}</td>
                    <td style={{ padding: '10px' }}>
                      <span
                        className={`badge ${row.count > 0 ? 'badge-green' : 'badge-neutral'}`}
                      >
                        {row.count} {row.count === 1 ? 'interessado' : 'interessados'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Gráficos Demonstrativos de Alcance e Funil */}
      <div className="two-col-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Evolução Diária — Alcance (Demonstração)</h2>
              <p className="card-subtitle">
                Dados demonstrativos até a conexão oficial da Instagram Graph API
              </p>
            </div>
            <span className="demo-micro-tag">Dados Demo</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
              gap: 10,
              alignItems: 'end',
              height: 210,
              paddingTop: 18,
            }}
          >
            {report.dailyTrend.map((item) => {
              const heightPct = Math.max(14, Math.round((item.reach / maxDailyReach) * 100));
              return (
                <div
                  key={item.day}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    {item.saves} salv.
                  </span>
                  <div
                    title={`${item.day}: ${formatNumberPt(item.reach)} alcance`}
                    style={{
                      width: '100%',
                      maxWidth: 48,
                      height: `${heightPct}%`,
                      borderRadius: '10px 10px 4px 4px',
                      background:
                        'linear-gradient(180deg, var(--purple-500) 0%, var(--purple-700) 100%)',
                    }}
                  />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {item.day}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Funil de Visibilidade → Interessados Reais</h2>
              <p className="card-subtitle">Alcance/visitas em demo; interessados são 100% reais</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {report.funnel.map((step, idx) => {
              const widthPct = Math.max(24, 100 - idx * 22);
              return (
                <div key={step.stage} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>{step.stage}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatNumberPt(step.value)}{' '}
                      <span
                        style={{
                          fontWeight: 500,
                          color: 'var(--text-muted)',
                          fontSize: '0.76rem',
                        }}
                      >
                        ({step.rateLabel})
                      </span>
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${widthPct}%`,
                        background:
                          idx === report.funnel.length - 1
                            ? 'var(--green-600)'
                            : 'linear-gradient(90deg, var(--purple-600), var(--green-600))',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <ToastMessage toast={toast} />
    </div>
  );
}
