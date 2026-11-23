'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  Send,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wand2,
} from 'lucide-react';
import type {
  BrandProfile,
  ContentPost,
  DashboardMetrics,
  IntegrationStatus,
} from '@/types/marketing';
import {
  CATEGORY_META,
  FORMAT_META,
  STATUS_META,
  STORY_MODE_META,
  STRATEGIC_OBJECTIVE_META,
  formatNumberPt,
  formatPtDateShort,
} from '@/lib/constants/labels';
import {
  DemoDataBanner,
  ErrorBanner,
  LoadingCards,
} from '@/components/FeedbackStates';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

interface DashboardResponse {
  metrics: DashboardMetrics;
  posts: ContentPost[];
  brand: BrandProfile;
  integrationStatus: IntegrationStatus;
}

export default function DashboardPage() {
  const { canApprove } = useCurrentUser();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar o painel.');
      const payload = (await res.json()) as DashboardResponse;
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Painel Geral</h1>
            <p className="page-description">Carregando indicadores e conteúdos da semana...</p>
          </div>
        </div>
        <LoadingCards count={7} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <div className="page-header">
          <h1>Painel Geral</h1>
        </div>
        <ErrorBanner message={error || 'Dados indisponíveis no momento.'} onRetry={loadDashboard} />
      </div>
    );
  }

  const { metrics, posts, brand, integrationStatus } = data;
  const totalWeekPosts = posts.length;
  const reviewedCount = totalWeekPosts - metrics.awaitingApprovalCount;
  const progressPercent =
    totalWeekPosts > 0 ? Math.round((reviewedCount / totalWeekPosts) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Olá, {brand.brandName}</h1>
          <p className="page-description">
            Acompanhe o desempenho do Instagram{' '}
            <a
              href={brand.instagramUrl || 'https://www.instagram.com/eujessynalin/'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--purple-700)', fontWeight: 700 }}
            >
              {brand.instagramHandle}
            </a>{' '}
            e aprove toda a semana de conteúdo em poucos minutos.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/conteudo" className="btn btn-secondary" id="dash-novo-conteudo">
            <Wand2 size={16} />
            Criar ou ajustar conteúdo
          </Link>
          <Link href="/aprovacao" className="btn btn-primary" id="dash-abrir-aprovacao">
            <CheckCircle2 size={16} />
            Central de Aprovação
          </Link>
        </div>
      </div>

      <DemoDataBanner />

      {/* Cartão Destaque — Revisão de Sábado */}
      <section className="banner banner-saturday" aria-label="Resumo da Revisão de Sábado">
        <div className="banner-content" style={{ flex: 1 }}>
          <Sparkles size={22} className="banner-icon" />
          <div style={{ width: '100%' }}>
            <p className="banner-title" style={{ fontSize: '1.08rem', marginBottom: 4 }}>
              Rotina de Sábado • {reviewedCount} de {totalWeekPosts} conteúdos revisados
            </p>
            <p className="banner-text" style={{ marginBottom: 12 }}>
              {metrics.awaitingApprovalCount > 0
                ? `Lote dos próximos 7 dias preparado antes de sábado (${metrics.nextSaturdayLabel}). Restam ${metrics.awaitingApprovalCount} publicações para sua aprovação humana (~${metrics.estimatedReviewMinutes} min).`
                : 'Excelente! Todos os conteúdos desta semana já foram revisados por você (aprovados localmente — sem publicação automática).'}
            </p>
            <div
              className="progress-track"
              style={{ background: 'rgba(255,255,255,0.22)', maxWidth: 420 }}
            >
              <div
                className="progress-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: '#A8F0D6',
                }}
              />
            </div>
          </div>
        </div>
        <Link
          href="/aprovacao"
          className="btn btn-lg"
          style={{ background: '#FFFFFF', color: '#4F236E', flexShrink: 0 }}
        >
          {metrics.awaitingApprovalCount > 0
            ? canApprove
              ? 'Aprovar semana agora'
              : 'Visualizar semana'
            : 'Ver semana revisada'}
          <ArrowRight size={17} />
        </Link>
      </section>

      {/* 7 KPIs Obrigatórios */}
      <section aria-label="Principais indicadores do Instagram">
        <div className="kpi-grid">
          <article className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Total de seguidores</span>
              <span className="kpi-icon-wrap">
                <Users size={17} />
              </span>
            </div>
            <div className="kpi-value">{formatNumberPt(metrics.totalFollowers)}</div>
            <div className="kpi-meta">
              <span className="kpi-delta">+{formatNumberPt(metrics.followerGrowthCount)} na semana</span>
              <span className="demo-micro-tag">Demo</span>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Crescimento de seguidores</span>
              <span className="kpi-icon-wrap green">
                <TrendingUp size={17} />
              </span>
            </div>
            <div className="kpi-value">+{metrics.followerGrowthPercent.toFixed(1).replace('.', ',')}%</div>
            <div className="kpi-meta">
              <span>Últimos 30 dias</span>
              <span className="demo-micro-tag">Demo</span>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Alcance semanal</span>
              <span className="kpi-icon-wrap">
                <Eye size={17} />
              </span>
            </div>
            <div className="kpi-value">{formatNumberPt(metrics.weeklyReach)}</div>
            <div className="kpi-meta">
              <span className="kpi-delta">+{metrics.weeklyReachGrowthPercent.toFixed(1).replace('.', ',')}% vs. sem. ant.</span>
              <span className="demo-micro-tag">Demo</span>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Engajamento</span>
              <span className="kpi-icon-wrap green">
                <Heart size={17} />
              </span>
            </div>
            <div className="kpi-value">{metrics.engagementRate.toFixed(1).replace('.', ',')}%</div>
            <div className="kpi-meta">
              <span className="kpi-delta">+{metrics.engagementGrowthPercent.toFixed(1).replace('.', ',')} pp</span>
              <span className="demo-micro-tag">Demo</span>
            </div>
          </article>

          <article className="kpi-card">
            <div className="kpi-top">
              <span className="kpi-label">Posts publicados</span>
              <span className="kpi-icon-wrap">
                <Send size={17} />
              </span>
            </div>
            <div className="kpi-value">{metrics.publishedPostsCount}</div>
            <div className="kpi-meta">
              <span>Histórico demonstrativo</span>
              <span className="demo-micro-tag">Demo</span>
            </div>
          </article>

          <article className="kpi-card kpi-card-highlight">
            <div className="kpi-top">
              <span className="kpi-label">Aguardando aprovação</span>
              <span className="kpi-icon-wrap gold">
                <Clock size={17} />
              </span>
            </div>
            <div className="kpi-value">{metrics.awaitingApprovalCount}</div>
            <div className="kpi-meta">
              <span>{metrics.approvedCount} aprovados localmente</span>
              <Link
                href="/aprovacao"
                style={{ color: 'var(--purple-700)', fontWeight: 700 }}
              >
                Revisar →
              </Link>
            </div>
          </article>

          <article className="kpi-card kpi-card-green">
            <div className="kpi-top">
              <span className="kpi-label">Clientes em potencial</span>
              <span className="kpi-icon-wrap green">
                <UserCheck size={17} />
              </span>
            </div>
            <div className="kpi-value">{metrics.potentialCustomersCount}</div>
            <div className="kpi-meta">
              <span>
                {metrics.potentialCustomersCount > 0
                  ? 'Registros reais da equipe'
                  : 'Sem registros reais (não inventamos leads)'}
              </span>
              <Link
                href="/analytics"
                style={{ color: 'var(--green-700)', fontWeight: 700 }}
              >
                Registrar →
              </Link>
            </div>
          </article>
        </div>
      </section>

      {/* Fila da Semana + Resumo Estratégico */}
      <div className="two-col-grid">
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Lote Semanal Preparado ({posts.length} conteúdos)</h2>
              <p className="card-subtitle">
                Equilíbrio semanal: Crescimento de audiência, Autoridade profissional e Captação de clientes
              </p>
            </div>
            <Link href="/calendario" className="btn btn-sm btn-secondary">
              <CalendarDays size={14} />
              Ver calendário
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {posts.map((post) => {
              const cat = CATEGORY_META[post.category];
              const fmt = FORMAT_META[post.format];
              const st = STATUS_META[post.status];
              const obj = STRATEGIC_OBJECTIVE_META[post.strategicObjective];
              const storyMode = post.storyExecutionMode
                ? STORY_MODE_META[post.storyExecutionMode]
                : null;
              return (
                <Link
                  key={post.id}
                  href={`/aprovacao?focus=${post.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    transition: 'border-color 150ms ease, background 150ms ease',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="meta-strip" style={{ marginBottom: 5 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--purple-800)' }}>
                        {post.dayOfWeek} • {formatPtDateShort(post.recommendedDate)} às {post.recommendedTime}
                      </span>
                      <span className={`badge ${obj.toneClass}`}>{obj.shortLabel}</span>
                      <span className={`badge ${cat.toneClass}`}>{cat.shortLabel}</span>
                      <span className="badge badge-neutral">{fmt.label}</span>
                      {storyMode && (
                        <span className={`badge ${storyMode.toneClass}`}>
                          {storyMode.shortLabel}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {post.title}
                    </div>
                  </div>
                  <span className={`badge ${st.toneClass}`}>{st.shortLabel}</span>
                </Link>
              );
            })}
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Identidade da Marca Ativa</h2>
                <p className="card-subtitle">Posicionamento e dados verificados pela equipe</p>
              </div>
              <Link href="/marca" className="btn btn-sm btn-secondary">
                Editar
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <img
                src="/brand/jessy-logo.jpg"
                alt="Logo Jessica Nalin Educação Parental"
                style={{
                  width: 72,
                  height: 72,
                  objectFit: 'contain',
                  borderRadius: 12,
                  border: '1px solid var(--border-subtle)',
                  background: '#FFFFFF',
                  padding: 6,
                }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem' }}>{brand.brandName}</div>
                <a
                  href={brand.instagramUrl || 'https://www.instagram.com/eujessynalin/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '0.82rem', color: 'var(--purple-700)', fontWeight: 600 }}
                >
                  {brand.instagramHandle}
                </a>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {brand.servicesOffered.length} serviços verificados
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
              <strong>Nicho:</strong> {brand.niche}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Paleta:
              </span>
              {[
                brand.visualIdentity.primaryColor,
                brand.visualIdentity.secondaryColor,
                brand.visualIdentity.accentColor,
              ].map((hex) => (
                <span
                  key={hex}
                  title={hex}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: hex,
                    border: '1px solid rgba(0,0,0,0.12)',
                  }}
                />
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Status das Integrações</h2>
                <p className="card-subtitle">Chaves protegidas exclusivamente no servidor</p>
              </div>
              <Link href="/automacao" className="btn btn-sm btn-ghost">
                Detalhes
              </Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { name: 'Supabase (Banco & Storage)', info: integrationStatus.services.supabase },
                { name: 'Google Gemini API (P2)', info: integrationStatus.services.gemini },
                { name: 'Metricool (Publicação P4)', info: integrationStatus.services.metricool },
              ].map((item) => (
                <div
                  key={item.name}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: '0.84rem' }}>{item.name}</strong>
                    <span
                      className={`badge ${item.info.configured ? 'badge-green' : 'badge-gold'}`}
                    >
                      {item.info.statusLabel}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    {item.info.detail}
                  </span>
                </div>
              ))}
            </div>
            {integrationStatus.knowledgeDocuments &&
              integrationStatus.knowledgeDocuments.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--purple-800)',
                      marginBottom: 6,
                    }}
                  >
                    Base de Conhecimento Oficial (P2 — {integrationStatus.knowledgeDocuments.length}{' '}
                    docs)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {integrationStatus.knowledgeDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          fontSize: '0.73rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                        }}
                      >
                        <span>• {doc.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </section>
        </aside>
      </div>
    </div>
  );
}
