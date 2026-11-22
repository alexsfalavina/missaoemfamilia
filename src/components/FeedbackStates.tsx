'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export function DemoDataBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div className="banner banner-demo" role="status" aria-live="polite">
      <div className="banner-content">
        <FlaskConical size={18} className="banner-icon" />
        <div>
          <p className="banner-title">
            Dados de Demonstração Ativos — Instagram Real Não Conectado
          </p>
          {!compact && (
            <p className="banner-text">
              As métricas exibidas abaixo são demonstrativas para validação da plataforma. A
              publicação automática no Instagram está desativada nesta etapa e nenhum conteúdo é
              enviado sem sua aprovação humana explícita.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function HumanSafetyBanner() {
  return (
    <div className="banner banner-safety" role="note">
      <div className="banner-content">
        <ShieldCheck size={19} className="banner-icon" />
        <div>
          <p className="banner-title">
            Aprovação Humana Obrigatória — Nenhuma publicação automática sem sua autorização
          </p>
          <p className="banner-text">
            Ao aprovar um conteúdo, ele é organizado no Calendário Editorial pronto para a Etapa 2.
            Nenhuma postagem é enviada ao Instagram neste momento.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="banner banner-error" role="alert">
      <div className="banner-content">
        <AlertTriangle size={18} className="banner-icon" />
        <div>
          <p className="banner-title">Ops! Algo não saiu como esperado</p>
          <p className="banner-text">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-secondary" onClick={onRetry}>
          <RefreshCw size={14} />
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div className="kpi-grid" aria-busy="true" aria-label="Carregando conteúdo">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="card" style={{ minHeight: 118 }}>
          <div className="skeleton" style={{ height: 14, width: '55%', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 30, width: '40%', marginBottom: 14 }} />
          <div className="skeleton" style={{ height: 12, width: '75%' }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Sparkles size={24} />
      </div>
      <h3 style={{ margin: 0, fontSize: '1.04rem' }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--text-secondary)', maxWidth: 460, fontSize: '0.88rem' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 8 }}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ToastMessage({
  toast,
}: {
  toast: { type: 'success' | 'error' | 'info'; text: string } | null;
}) {
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'error' ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
      <span>{toast.text}</span>
    </div>
  );
}
