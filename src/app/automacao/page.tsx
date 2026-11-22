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
  ContentCategory,
  IntegrationStatus,
} from '@/types/marketing';
import { CATEGORY_META } from '@/lib/constants/labels';
import {
  ErrorBanner,
  LoadingCards,
  ToastMessage,
} from '@/components/FeedbackStates';

export default function AutomationPage() {
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
    setTimeout(() => setToast(null), 3800);
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

  const categoryKeys: ContentCategory[] = [
    'educativo',
    'emocional',
    'autoridade',
    'engajamento',
    'comercial',
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Automação Semanal & Integrações</h1>
          <p className="page-description">
            Configure a preparação automática do lote de 7 publicações para revisão todos os sábados
            em 10 a 15 minutos e acompanhe a prontidão técnica das integrações.
          </p>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResetDemo}
            disabled={saving}
          >
            <RotateCcw size={15} />
            Restaurar lote inicial (Demo)
          </button>
        </div>
      </div>

      <div className="two-col-grid" style={{ alignItems: 'start' }}>
        <form onSubmit={handleSave} className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Agenda da Revisão de Sábado</h2>
              <p className="card-subtitle">
                O sistema prepara a semana seguinte e deixa tudo pronto para sua aprovação
              </p>
            </div>
            <Clock size={18} color="var(--purple-600)" />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="auto-review-day">
                Dia da revisão semanal
              </label>
              <select
                id="auto-review-day"
                className="select"
                value={settings.reviewDay}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reviewDay: e.target.value as AutomationSettings['reviewDay'],
                  })
                }
              >
                <option value="sabado">Sábado (Recomendado — 10 a 15 min)</option>
                <option value="sexta">Sexta-feira</option>
                <option value="domingo">Domingo</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="auto-ready-time">
                Horário em que o lote fica pronto
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
                Publicações por semana
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
                <option value="whatsapp">WhatsApp (Resumo de Sábado)</option>
                <option value="email">E-mail</option>
                <option value="painel">Somente no Painel</option>
              </select>
            </div>

            <div className="form-group full">
              <label className="form-label" htmlFor="auto-recipient">
                Responsável pela revisão
              </label>
              <input
                id="auto-recipient"
                type="text"
                className="input"
                value={settings.notificationRecipient}
                onChange={(e) =>
                  setSettings({ ...settings, notificationRecipient: e.target.value })
                }
              />
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <span className="form-label" style={{ display: 'block', marginBottom: 8 }}>
              Distribuição semanal por pilar estratégico
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
              {categoryKeys.map((cat) => (
                <div
                  key={cat}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                    {CATEGORY_META[cat].shortLabel}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    className="input"
                    value={settings.categoryMix[cat] ?? 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        categoryMix: {
                          ...settings.categoryMix,
                          [cat]: Math.max(0, Number(e.target.value) || 0),
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: 'var(--green-800)', fontSize: '0.86rem' }}>
              <ShieldCheck size={17} />
              Travas de Segurança Ativas (Não editáveis)
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--green-800)' }}>
              • <strong>Aprovação humana explícita:</strong> SEMPRE OBRIGATÓRIA antes de qualquer
              agendamento definitivo.
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--green-800)' }}>
              • <strong>Publicação automática no Instagram:</strong> DESATIVADA nesta etapa (nunca
              simula publicação falsa).
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <button type="submit" id="automation-save-btn" className="btn btn-primary" disabled={saving}>
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar configurações da semana'}
            </button>
          </div>
        </form>

        {/* Prontidão Técnica de Integrações */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Arquitetura de Integrações (Servidor)</h2>
                <p className="card-subtitle">
                  Nenhuma chave de API fica exposta no frontend
                </p>
              </div>
              <Database size={18} color="var(--purple-600)" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                {
                  title: 'Supabase (PostgreSQL + RLS)',
                  status: status.services.supabase.statusLabel,
                  detail: status.services.supabase.detail,
                  env: 'SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY',
                },
                {
                  title: 'Google Gemini API',
                  status: status.services.gemini.statusLabel,
                  detail: status.services.gemini.detail,
                  env: 'GEMINI_API_KEY, GEMINI_MODEL',
                },
                {
                  title: 'Instagram Graph API (Meta)',
                  status: status.services.instagram.statusLabel,
                  detail: status.services.instagram.detail,
                  env: 'INSTAGRAM_USERNAME, INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID',
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: '0.9rem' }}>{svc.title}</strong>
                    <span className="badge badge-gold">{svc.status}</span>
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

          <section className="card card-compact" style={{ background: 'var(--purple-50)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Sparkles size={18} color="var(--purple-700)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.82rem', color: 'var(--purple-900)' }}>
                <strong>Esquema Supabase pronto para produção:</strong> o arquivo{' '}
                <code>src/lib/supabase/schema.sql</code> já contém todas as tabelas, auditoria de
                aprovação humana e políticas RLS preparadas para a Etapa 2.
              </div>
            </div>
          </section>
        </aside>
      </div>

      <ToastMessage toast={toast} />
    </div>
  );
}
