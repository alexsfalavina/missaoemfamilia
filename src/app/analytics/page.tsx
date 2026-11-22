'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Bookmark,
  Eye,
  MessageCircle,
  Share2,
  TrendingUp,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import type { AnalyticsReport } from '@/types/marketing';
import { formatNumberPt } from '@/lib/constants/labels';
import {
  DemoDataBanner,
  ErrorBanner,
  LoadingCards,
} from '@/components/FeedbackStates';

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar os relatórios.');
      const data = await res.json();
      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar métricas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Analytics & Geração de Leads</h1>
        </div>
        <LoadingCards count={7} />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div>
        <div className="page-header">
          <h1>Analytics & Geração de Leads</h1>
        </div>
        <ErrorBanner message={error || 'Relatório indisponível.'} onRetry={loadAnalytics} />
      </div>
    );
  }

  const maxDailyReach = Math.max(...report.dailyTrend.map((d) => d.reach), 1);

  const metricCards = [
    { label: 'Alcance', value: report.summary.reach, icon: Eye, tone: '' },
    { label: 'Compartilhamentos', value: report.summary.shares, icon: Share2, tone: '' },
    { label: 'Salvamentos', value: report.summary.saves, icon: Bookmark, tone: 'green' },
    { label: 'Comentários', value: report.summary.comments, icon: MessageCircle, tone: '' },
    { label: 'Visitas ao perfil', value: report.summary.profileVisits, icon: TrendingUp, tone: '' },
    { label: 'Novos seguidores', value: report.summary.newFollowers, icon: UserPlus, tone: 'green' },
    {
      label: 'Leads gerados',
      value: report.summary.leadsGenerated,
      icon: UserCheck,
      tone: 'green',
      highlight: true,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Analytics & Geração de Leads</h1>
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
            : acompanhe como cada formato de conteúdo transforma alcance orgânico em conversas reais
            e clientes para o Método ALMA.
          </p>
        </div>
        <div className="page-actions">
          <span className="badge badge-purple">{report.instagramHandle || '@eujessynalin'}</span>
          <span className="badge badge-gold">{report.periodLabel}</span>
        </div>
      </div>

      <DemoDataBanner />

      {/* 7 Métricas Obrigatórias */}
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
                <span>Últimos 7 dias</span>
                <span className="demo-micro-tag">Demo</span>
              </div>
            </article>
          );
        })}
      </section>

      <div className="two-col-grid">
        {/* Gráfico Diário de Alcance e Leads */}
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Evolução Diária — Alcance vs. Leads</h2>
              <p className="card-subtitle">
                Distribuição semanal demonstrativa para acompanhamento de rotina
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
              height: 220,
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
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: 'var(--green-800)',
                      background: 'var(--green-50)',
                      padding: '2px 6px',
                      borderRadius: 6,
                    }}
                  >
                    {item.leads} leads
                  </span>
                  <div
                    title={`${item.day}: ${formatNumberPt(item.reach)} alcance • ${item.saves} salvamentos`}
                    style={{
                      width: '100%',
                      maxWidth: 48,
                      height: `${heightPct}%`,
                      borderRadius: '10px 10px 4px 4px',
                      background:
                        'linear-gradient(180deg, var(--purple-500) 0%, var(--purple-700) 100%)',
                      transition: 'height 300ms ease',
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

        {/* Funil de Conversão de Clientes */}
        <section className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Funil de Captação de Clientes</h2>
              <p className="card-subtitle">Prioridade em leads qualificados, não apenas seguidores</p>
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
                      <span style={{ fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.76rem' }}>
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

      {/* Desempenho por Formato */}
      <section className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Desempenho por Formato de Conteúdo</h2>
            <p className="card-subtitle">Comparativo médio de alcance, salvamentos e geração de leads</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Formato</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Alcance médio</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Salvamentos médios</th>
                <th style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>Leads gerados</th>
              </tr>
            </thead>
            <tbody>
              {report.formatPerformance.map((row) => (
                <tr key={row.format} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '12px', fontWeight: 700 }}>{row.label}</td>
                  <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatNumberPt(row.avgReach)}
                  </td>
                  <td style={{ padding: '12px', fontVariantNumeric: 'tabular-nums' }}>
                    {formatNumberPt(row.avgSaves)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className="badge badge-green">{row.leads} leads</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
