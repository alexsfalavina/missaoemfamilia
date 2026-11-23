'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Clock,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import type { AuthUser } from '@/types/marketing';
import { USER_ROLE_META } from '@/lib/constants/labels';

interface NavItemConfig {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number }>;
  section: 'principal' | 'gestao';
  showPendingBadge?: boolean;
}

const NAV_ITEMS: NavItemConfig[] = [
  {
    href: '/',
    label: 'Painel Geral',
    shortLabel: 'Painel',
    icon: LayoutDashboard,
    section: 'principal',
  },
  {
    href: '/aprovacao',
    label: 'Central de Aprovação',
    shortLabel: 'Aprovação',
    icon: CheckSquare,
    section: 'principal',
    showPendingBadge: true,
  },
  {
    href: '/calendario',
    label: 'Calendário Editorial',
    shortLabel: 'Calendário',
    icon: CalendarDays,
    section: 'principal',
  },
  {
    href: '/conteudo',
    label: 'Gestão de Conteúdo',
    shortLabel: 'Conteúdo',
    icon: Wand2,
    section: 'principal',
  },
  {
    href: '/marca',
    label: 'Perfil da Marca',
    shortLabel: 'Marca',
    icon: HeartHandshake,
    section: 'gestao',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    shortLabel: 'Analytics',
    icon: BarChart3,
    section: 'gestao',
  },
  {
    href: '/automacao',
    label: 'Automação Semanal',
    shortLabel: 'Automação',
    icon: Clock,
    section: 'gestao',
  },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Painel Geral',
    subtitle: 'Visão rápida do Instagram e da revisão de sábado',
  },
  '/aprovacao': {
    title: 'Central de Aprovação',
    subtitle: 'Revise e aprove os 7 conteúdos da semana em 10 a 15 minutos',
  },
  '/calendario': {
    title: 'Calendário Editorial',
    subtitle: 'Publicações aprovadas e agenda recomendada da semana',
  },
  '/conteudo': {
    title: 'Gestão de Conteúdo & Designer IA',
    subtitle: 'Estratégia semanal, criador de posts e estúdio visual 1080px',
  },
  '/marca': {
    title: 'Perfil da Marca — Jessica Nalin',
    subtitle: 'Posicionamento, tom de voz, identidade visual e objetivos',
  },
  '/analytics': {
    title: 'Analytics & Geração de Leads',
    subtitle: 'Desempenho de alcance, salvamentos e clientes em potencial',
  },
  '/automacao': {
    title: 'Automação Semanal & Integrações',
    subtitle: 'Rotina de sábado e prontidão Supabase, Gemini e Metricool',
  },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const isAuthPage = pathname === '/login';

  const loadPendingCount = useCallback(async () => {
    if (isAuthPage) return;
    try {
      const [dashRes, meRes] = await Promise.all([
        fetch('/api/dashboard', { cache: 'no-store' }),
        fetch('/api/auth/me', { cache: 'no-store' }),
      ]);
      if (dashRes.ok) {
        const data = await dashRes.json();
        if (typeof data?.metrics?.awaitingApprovalCount === 'number') {
          setPendingCount(data.metrics.awaitingApprovalCount);
        }
      }
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData?.user) setCurrentUser(meData.user as AuthUser);
      }
    } catch {
      // Silencioso no badge lateral
    }
  }, [isAuthPage]);

  useEffect(() => {
    loadPendingCount();
    const handler = () => {
      loadPendingCount();
    };
    window.addEventListener('jessica-marketing-updated', handler);
    return () => window.removeEventListener('jessica-marketing-updated', handler);
  }, [loadPendingCount, pathname]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  if (isAuthPage) {
    return <>{children}</>;
  }

  const currentMeta = PAGE_TITLES[pathname] ?? {
    title: 'JESSICA AI MARKETING',
    subtitle: 'Plataforma de Marketing para Instagram',
  };

  const principalNav = NAV_ITEMS.filter((i) => i.section === 'principal');
  const gestaoNav = NAV_ITEMS.filter((i) => i.section === 'gestao');

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay ${drawerOpen ? 'open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`} aria-label="Navegação principal">
        <div className="sidebar-brand">
          <div className="brand-mark-box">
            <img src="/brand/jn-monogram.jpg" alt="Monograma Jessica Nalin" />
          </div>
          <div className="brand-title-group">
            <div className="brand-app-name">JESSICA AI MARKETING</div>
            <a
              href="https://www.instagram.com/eujessynalin/"
              target="_blank"
              rel="noopener noreferrer"
              className="brand-handle"
              style={{ display: 'block' }}
            >
              @eujessynalin
            </a>
          </div>
          <button
            type="button"
            className="mobile-menu-btn"
            style={{ marginLeft: 'auto', width: 32, height: 32 }}
            onClick={() => setDrawerOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={17} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Rotina Semanal</div>
          {principalNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.shortLabel.toLowerCase()}`}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.showPendingBadge && pendingCount !== null && (
                  <span className={`nav-badge ${pendingCount > 0 ? 'attention' : ''}`}>
                    {pendingCount}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="nav-section-label">Estratégia & Sistema</div>
          {gestaoNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                id={`nav-${item.shortLabel.toLowerCase()}`}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="saturday-mini-card">
            <div className="saturday-mini-title">
              <Sparkles size={14} />
              Revisão de Sábado (10–15 min)
            </div>
            <p className="saturday-mini-text">
              {pendingCount === null
                ? 'Sincronizando lote semanal...'
                : pendingCount === 0
                  ? 'Semana revisada! Todos os conteúdos pendentes foram tratados.'
                  : `${pendingCount} ${
                      pendingCount === 1 ? 'publicação aguarda' : 'publicações aguardam'
                    } sua aprovação humana.`}
            </p>
          </div>
          <div className="user-pill">
            <img
              src="/brand/jessica-portrait.jpg"
              alt="Foto de Jessica Nalin"
              className="user-avatar"
            />
            <div className="user-meta" style={{ minWidth: 0, flex: 1 }}>
              <div className="user-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.name || 'Jessica Nalin'}
              </div>
              <div className="user-role">
                {currentUser ? USER_ROLE_META[currentUser.role].label : 'Educação Parental'}
              </div>
            </div>
            <button
              type="button"
              id="sidebar-logout-btn"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Encerrar sessão"
              aria-label="Sair da conta"
              className="btn btn-sm btn-ghost"
              style={{ padding: '6px 8px', flexShrink: 0 }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menu de navegação"
            >
              <Menu size={19} />
            </button>
            <div className="topbar-context">
              <span className="topbar-subtitle">{currentMeta.subtitle}</span>
              <span className="topbar-title">{currentMeta.title}</span>
            </div>
          </div>

          <div className="topbar-right">
            <Link
              href="/automacao"
              className="demo-chip"
              title="Dados demonstrativos ativos. Clique para ver o status das integrações."
            >
              <span className="demo-chip-dot" />
              <span>Modo Demonstração</span>
            </Link>
            {pathname !== '/aprovacao' && (
              <Link href="/aprovacao" className="btn btn-sm btn-primary" id="topbar-revisar-btn">
                <CheckSquare size={15} />
                Revisar semana{pendingCount ? ` (${pendingCount})` : ''}
              </Link>
            )}
          </div>
        </header>

        <main className="page-container">{children}</main>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Navegação rápida móvel">
        {principalNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-bottom-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
