-- ============================================================================
-- JESSICA AI MARKETING — Esquema SQL preparado para Supabase (PostgreSQL)
-- Execute este script no SQL Editor do Supabase ao migrar para produção.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Perfil da Marca
create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null default 'Jessica Nalin',
  instagram_handle text not null default '@eujessynalin',
  instagram_url text not null default 'https://www.instagram.com/eujessynalin/',
  niche text not null,
  target_audience text not null,
  services_offered jsonb not null default '[]'::jsonb,
  brand_voice text not null,
  brand_values jsonb not null default '[]'::jsonb,
  visual_identity jsonb not null default '{}'::jsonb,
  business_objectives jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Publicações Semanais & Conteúdos
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  week_label text not null,
  day_of_week text not null,
  title text not null,
  category text not null check (category in ('educativo', 'emocional', 'autoridade', 'engajamento', 'comercial')),
  format text not null check (format in ('carrossel', 'reels', 'post_unico', 'stories')),
  aspect_ratio text not null check (aspect_ratio in ('1080x1350', '1080x1920')),
  marketing_objective text not null,
  conversion_focus text not null,
  caption text not null,
  hashtags text[] not null default '{}',
  cta text not null,
  recommended_date date not null,
  recommended_time text not null,
  status text not null default 'aguardando_aprovacao'
    check (status in ('aguardando_aprovacao', 'aprovado', 'alteracoes_solicitadas', 'rejeitado')),
  approval_feedback text,
  approved_at timestamptz,
  approved_by text,
  publishing_state text not null default 'bloqueado_sem_integracao'
    check (publishing_state in ('nao_publicado', 'bloqueado_sem_integracao', 'agendado_meta', 'publicado')),
  data_source text not null default 'demo' check (data_source in ('demo', 'live')),
  slides jsonb not null default '[]'::jsonb,
  reels_script jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_posts_status on public.content_posts(status);
create index if not exists idx_content_posts_recommended_date on public.content_posts(recommended_date);

-- 3. Auditoria de Aprovação Humana (Garante rastreabilidade antes de qualquer publicação)
create table if not exists public.approval_audit_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(id) on delete cascade,
  action text not null check (action in ('APROVAR', 'SOLICITAR_ALTERACOES', 'REJEITAR', 'REAGENDAR', 'EDITAR')),
  actor text not null,
  note text,
  created_at timestamptz not null default now()
);

-- 4. Configurações da Automação Semanal (Revisão de Sábado)
create table if not exists public.automation_settings (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  enabled boolean not null default true,
  review_day text not null default 'sabado' check (review_day in ('sexta', 'sabado', 'domingo')),
  ready_time text not null default '08:00',
  posts_per_week integer not null default 7 check (posts_per_week between 1 and 14),
  notification_channel text not null default 'whatsapp' check (notification_channel in ('whatsapp', 'email', 'painel')),
  notification_recipient text not null default '',
  require_explicit_human_approval boolean not null default true check (require_explicit_human_approval = true),
  auto_publish_enabled boolean not null default false,
  category_mix jsonb not null default '{}'::jsonb,
  last_prepared_at timestamptz,
  next_preparation_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 5. Snapshots de Métricas do Instagram (Distinção clara entre demo e live)
create table if not exists public.instagram_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  instagram_handle text not null default '@eujessynalin',
  data_source text not null default 'demo' check (data_source in ('demo', 'live')),
  period_start date not null,
  period_end date not null,
  total_followers integer not null default 0,
  new_followers integer not null default 0,
  reach integer not null default 0,
  shares integer not null default 0,
  saves integer not null default 0,
  comments integer not null default 0,
  profile_visits integer not null default 0,
  leads_generated integer not null default 0,
  captured_at timestamptz not null default now()
);

-- Row Level Security (habilitar ao configurar autenticação de usuários)
alter table public.brand_profiles enable row level security;
alter table public.content_posts enable row level security;
alter table public.approval_audit_logs enable row level security;
alter table public.automation_settings enable row level security;
alter table public.instagram_metrics_snapshots enable row level security;
