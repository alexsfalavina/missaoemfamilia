'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LogIn, ShieldCheck } from 'lucide-react';

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authModeInfo, setAuthModeInfo] = useState<{
    authProvider: 'supabase' | 'local_dev';
    localDevHintEmail?: string;
  } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.authenticated) {
          router.replace(nextPath.startsWith('/') ? nextPath : '/');
          return;
        }
        setAuthModeInfo({
          authProvider: data.authProvider,
          localDevHintEmail: data.localDevHintEmail,
        });
      })
      .catch(() => {
        // Silencioso
      });
  }, [nextPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'E-mail ou senha inválidos.');
        return;
      }
      const safeTarget = nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : '/';
      window.location.href = safeTarget;
    } catch {
      setError('Não foi possível conectar ao servidor para autenticação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background:
          'radial-gradient(circle at top right, rgba(123, 63, 160, 0.12), transparent 45%), radial-gradient(circle at bottom left, rgba(62, 139, 116, 0.1), transparent 45%), var(--bg-canvas)',
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 430,
          padding: 32,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 22,
          }}
        >
          <div className="brand-mark-box" style={{ width: 52, height: 52 }}>
            <img src="/brand/jn-monogram.jpg" alt="Monograma Jessica Nalin" />
          </div>
          <div>
            <div className="brand-app-name" style={{ fontSize: '0.92rem' }}>
              JESSICA AI MARKETING
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--purple-700)', fontWeight: 700 }}>
              @eujessynalin • Educação Parental
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: '1.38rem', marginBottom: 6 }}>Acesso Seguro à Plataforma</h1>
        <p style={{ margin: '0 0 22px', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
          Entre com sua conta autorizada para revisar a semana, gerenciar a biblioteca de mídia e
          aprovar conteúdos com segurança.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: '#FCECEC',
              border: '1px solid #F5C2C2',
              color: '#8E2525',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: '0.83rem',
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              E-mail autorizado
            </label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="nome@missaoemfamilia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Senha
            </label>
            <input
              id="login-password"
              type="password"
              className="input"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            id="login-submit-btn"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
            disabled={submitting}
          >
            <LogIn size={17} />
            {submitting ? 'Verificando acesso...' : 'Entrar na plataforma'}
          </button>
        </form>

        <div
          style={{
            marginTop: 20,
            padding: '12px 14px',
            borderRadius: 12,
            background: 'var(--green-50)',
            border: '1px solid var(--green-200)',
            fontSize: '0.77rem',
            color: 'var(--green-800)',
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <ShieldCheck size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Sessão protegida no servidor (HttpOnly):</strong> controle de permissões por
            perfil (Proprietária, Editora ou Visualização) e chaves de API isoladas no backend.
          </div>
        </div>

        {authModeInfo?.authProvider === 'local_dev' && (
          <div
            style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'var(--purple-50)',
              border: '1px solid var(--purple-200)',
              fontSize: '0.75rem',
              color: 'var(--purple-900)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <Lock size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong>Ambiente local de desenvolvimento:</strong> Supabase Auth ainda não
              configurado neste servidor. Conta local proprietária:{' '}
              <code>{authModeInfo.localDevHintEmail}</code> (use a senha configurada no servidor).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }} />}>
      <LoginFormInner />
    </Suspense>
  );
}
