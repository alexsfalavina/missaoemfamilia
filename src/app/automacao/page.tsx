'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Clock,
  Database,
  Lock,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AutomationSettings,
  IntegrationStatus,
  StrategicObjective,
} from '@/types/marketing';
import { STRATEGIC_OBJECTIVE_META } from '@/lib/constants/labels';
import {
  ErrorBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';
import { useCurrentUser } from '@/lib/auth/useCurrentUser';

export default function AutomationPage() {
  const { canEdit, canResetDemo } = useCurrentUser();
  const [settings, setSettings] = useState<AutomationSettings | null>(null);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/automation', { cache: 'no-store' });
      if (!res.ok) throw new Error('Não foi possível carregar as configurações.');
      const data = await res.json();
      setSettings(data.settings);
      setStatus(data.integrationStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar automação.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch('/api/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setSettings(data.settings);
      showToast('success', data.message || 'Configurações da rotina de sábado salvas!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrepareNextWeek = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prepare_next_week' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao preparar lote.');
      setSettings(data.settings);
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('success', data.message || 'Próximos 7 dias preparados para aprovação de sábado!');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao preparar semana.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDemo = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/automation', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_demo' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao restaurar.');
      setSettings(data.settings);
      window.dispatchEvent(new Event('jessica-marketing-updated'));
      showToast('info', data.message || 'Dados iniciais restaurados.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Falha ao restaurar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Automação Semanal & Integrações</h1>
        </div>
        <LoadingCards count={3} />
      </div>
    );
  }

  if (error || !settings || !status) {
    return (
      <div>
        <div className="page-header">
          <h1>Automação Semanal & Integrações</h1>
        </div>
        <ErrorBanner message={error || 'Não foi possível abrir esta seção.'} onRetry={loadData} />
      </div>
    );
  }

  const objectiveKeys: StrategicObjective[] = [
    'crescimento_audiencia',
    'autoridade_profissional',
    'captacao_clientes',
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Automação Semanal & Integrações</h1>
          <p className="page-description">
            Sábado é o dia oficial de aprovação (10–15 min). O sistema prepara os próximos 7 dias
            antes de sábado e nunca publica nada sem aprovação humana explícita.
          </p>
        </div>
        <div className="page-actions">
          {canEdit && (
            <button
              type="button"
              id="automation-prepare-week-btn"
              className="btn btn-primary"
              onClick={handlePrepareNextWeek}
              disabled={saving}
            >
              <Sparkles size={15} />
              Preparar próximos 7 dias agora
            </button>
          )}
          {canResetDemo && (
            <button
              type="button"
              id="automation-reset-demo-btn"
              className="btn btn-secondary"
              onClick={handleResetDemo}
              disabled={saving}
            >
              <RotateCcw size={15} />
              Restaurar lote inicial
            </button>
          )}
        </div>
      </div>

      <div className="two-col-grid" style={{ alignItems: 'start' }}>
        <form onSubmit={handleSave} className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Preparação Pré-Sábado & Revisão Oficial</h2>
              <p className="card-subtitle">
                Os 7 conteúdos ficam prontos antes do sábado para revisão rápida
              </p>
            </div>
            <Clock size={18} color="var(--purple-600)" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="auto-prep-day">
                Dia de preparação automática (antes de sábado)
              </label>
              <select
                id="auto-prep-day"
                className="select"
                value={settings.preparationDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    preparationDay: e.target.value as 'quinta' | 'sexta',
                  })
                }
              >
                <option value="sexta">Sexta-feira (Recomendado)</option>
                <option value="quinta">Quinta-feira</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auto-prep-time">
                Horário da preparação automática
              </label>
              <input
                id="auto-prep-time"
                type="time"
                className="input"
                value={settings.preparationTime}
                onChange={(e) => setSettings({ ...settings, preparationTime: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auto-review-day">
                Dia oficial de aprovação humana
              </label>
              <input
                id="auto-review-day"
                type="text"
                className="input"
                value="Sábado (Oficial — 10 a 15 minutos)"
                disabled
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auto-ready-time">
                Horário disponível para revisão no sábado
              </label>
              <input
                id="auto-ready-time"
                type="time"
                className="input"
                value={settings.readyTime}
                onChange={(e) => setSettings({ ...settings, readyTime: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auto-posts-count">
                Publicações preparadas por semana
              </label>
              <input
                id="auto-posts-count"
                type="number"
                min={1}
                max={14}
                className="input"
                value={settings.postsPerWeek}
                onChange={(e) =>
                  setSettings({ ...settings, postsPerWeek: Number(e.target.value) || 7 })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auto-channel">
                Aviso de lote pronto
              </label>
              <select
                id="auto-channel"
                className="select"
                value={settings.notificationChannel}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    notificationChannel: e.target.value as AutomationSettings['notificationChannel'],
                  })
                }
              >
                <option value="whatsapp">WhatsApp (Aviso de Sábado)</option>
                <option value="email">E-mail</option>
                <option value="painel">Somente no Painel</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <span className="form-label" style={{ display: 'block', marginBottom: 8 }}>
              Equilíbrio semanal dos 3 objetivos estratégicos (A / B / C)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {objectiveKeys.map((obj) => (
                <div
                  key={obj}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: '0.76rem', fontWeight: 700 }}>
                    {STRATEGIC_OBJECTIVE_META[obj].shortLabel}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    className="input"
                    value={settings.objectiveMix[obj] ?? 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        objectiveMix: {
                          ...settings.objectiveMix,
                          [obj]: Math.max(0, Number(e.target.value) || 0),
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Travas obrigatórias de segurança */}
          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 12,
              background: 'var(--green-50)',
              border: '1px solid var(--green-200)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 700,
                color: 'var(--green-800)',
                fontSize: '0.86rem',
              }}
            >
              <ShieldCheck size={17} />
              Travas de Segurança Ativas (Não editáveis)
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--green-800)' }}>
              • <strong>Aprovação humana explícita:</strong> SEMPRE OBRIGATÓRIA antes de qualquer
              publicação.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--green-800)' }}>
              • <strong>Publicação automática no Instagram:</strong> DESATIVADA nesta etapa (nunca
              afirma que um conteúdo foi publicado quando foi apenas aprovado localmente).
            </div>
          </div>

          {canEdit && (
            <div style={{ marginTop: 18 }}>
              <button
                type="submit"
                id="automation-save-btn"
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={16} />
                {saving ? 'Salvando...' : 'Salvar configurações da semana'}
              </button>
            </div>
          )}
        </form>

        {/* Prontidão Técnica de Integrações */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Arquitetura de Integrações (Servidor)</h2>
                <p className="card-subtitle">Nenhuma chave de API fica exposta no frontend</p>
              </div>
              <Database size={18} color="var(--purple-600)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  title: 'Supabase Free (PostgreSQL + RLS + Storage)',
                  status: status.services.supabase.statusLabel,
                  configured: status.services.supabase.configured,
                  detail: status.services.supabase.detail,
                  env: 'Credenciais isoladas no servidor (PostgreSQL + Storage 50 MB)',
                },
                {
                  title: 'Google Gemini API (P2)',
                  status: status.services.gemini.statusLabel,
                  configured: status.services.gemini.configured,
                  detail: status.services.gemini.detail,
                  env: 'Chave de IA isolada exclusivamente no backend (ativação na P2)',
                },
                {
                  title: 'Metricool — Publicação & Métricas Futuras (P4)',
                  status: status.services.metricool.statusLabel,
                  configured: status.services.metricool.configured,
                  detail: status.services.metricool.detail,
                  env: 'Integração futura exclusivamente no backend (desativado na P1)',
                },
              ].map((svc) => (
                <div
                  key={svc.title}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 12,
                    padding: 14,
                    background: 'var(--bg-elevated)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <strong style={{ fontSize: '0.9rem' }}>{svc.title}</strong>
                    <span className={`badge ${svc.configured ? 'badge-green' : 'badge-gold'}`}>
                      {svc.status}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {svc.detail}
                  </p>
                  <div
                    style={{
                      fontSize: '0.73rem',
                      color: 'var(--text-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontFamily: 'monospace',
                    }}
                  >
                    <Lock size={12} />
                    {svc.env}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card card-compact">
            <div className="card-header" style={{ marginBottom: 10 }}>
              <div>
                <h2 className="card-title" style={{ fontSize: '0.95rem' }}>
                  Base de Conhecimento Oficial Registrada (P2)
                </h2>
                <p className="card-subtitle">
                  Fontes oficiais preservadas por versão — conteúdo original será importado na P2
                  sem substituições
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(status.knowledgeDocuments ?? []).map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    background: 'var(--bg-subtle)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 3,
                    }}
                  >
                    <strong style={{ fontSize: '0.8rem', color: 'var(--purple-900)' }}>
                      {doc.title}
                    </strong>
                    <span className="badge badge-purple" style={{ fontSize: '0.67rem' }}>
                      v{doc.version}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Status: Aguardando importação integral na P2
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card card-compact" style={{ background: 'var(--purple-50)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Sparkles
                size={18}
                color="var(--purple-700)"
                style={{ flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ fontSize: '0.82rem', color: 'var(--purple-900)' }}>
                <strong>Esquema Supabase Free (P1) pronto:</strong>{' '}
                <code>src/lib/supabase/schema.sql</code> inclui controle de acesso (
                <code>user_profiles</code> + RLS), lotes versionados (<code>weekly_batches</code>),
                associações de mídia (<code>media_associations</code>), trilha de auditoria e
                registro dos 3 documentos oficiais (<code>knowledge_documents</code>).
              </div>
            </div>
          </section>
        </aside>
      </div>

      <ToastMessage toast={toast} />
    </div>
  );
}
