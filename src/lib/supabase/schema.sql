-- ============================================================================
-- JESSICA AI MARKETING — Esquema SQL preparado para Supabase (PostgreSQL)
-- Execute este script no SQL Editor do Supabase ao migrar para produção.
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Perfil da Marca (Inclui posicionamento profissional e dados comerciais verificados)
create table if not exists public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null default 'Jessica Nalin',
  instagram_handle text not null default '@eujessynalin',
  instagram_url text not null default 'https://www.instagram.com/eujessynalin/',
  niche text not null,
  positioning_pillars jsonb not null default '[]'::jsonb,
  target_audience text not null,
  services_offered jsonb not null default '[]'::jsonb,
  verified_commercial_info jsonb not null default '{}'::jsonb,
  brand_voice text not null,
  brand_values jsonb not null default '[]'::jsonb,
  visual_identity jsonb not null default '{}'::jsonb,
  business_objectives jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Biblioteca de Mídia Autêntica (Fotos reais, vídeos gravados por Jessica, logos e materiais)
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  name text not null,
  category text not null check (category in ('foto_pessoal', 'foto_profissional', 'video', 'logo_marca', 'material_existente')),
  authenticity text not null check (authenticity in ('autentico_jessica', 'logo_oficial', 'ilustracao_demo')),
  url text not null,
  mime_type text not null,
  file_size_bytes bigint,
  notes text,
  created_at timestamptz not null default now()
);

-- 3. Publicações Semanais & Fluxo de Reels / Stories
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  week_label text not null,
  day_of_week text not null,
  title text not null,
  category text not null check (category in ('educativo', 'emocional', 'autoridade', 'engajamento', 'comercial')),
  strategic_objective text not null check (strategic_objective in ('crescimento_audiencia', 'autoridade_profissional', 'captacao_clientes')),
  tone_profile text not null default 'acolhedor_sereno'
    check (tone_profile in ('acolhedor_sereno', 'tecnico_acessivel', 'firme_pratico', 'reflexivo_profundo')),
  format text not null check (format in ('carrossel', 'reels', 'post_unico', 'stories')),
  aspect_ratio text not null check (aspect_ratio in ('1080x1350', '1080x1920')),
  defined_audience text not null,
  opening_hook text not null,
  educational_value text not null,
  marketing_objective text not null,
  conversion_focus text not null,
  service_connection text,
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
  story_execution_mode text check (story_execution_mode in ('publicacao_automatica', 'acao_manual_instagram')),
  story_manual_instructions text,
  slides jsonb not null default '[]'::jsonb,
  reels_script jsonb,
  reels_production jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_posts_status on public.content_posts(status);
create index if not exists idx_content_posts_recommended_date on public.content_posts(recommended_date);

-- 4. Auditoria de Aprovação Humana
create table if not exists public.approval_audit_logs (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(id) on delete cascade,
  action text not null check (action in ('APROVAR', 'SOLICITAR_ALTERACOES', 'REJEITAR', 'REAGENDAR', 'EDITAR', 'REGENERAR', 'ALTERAR_TOM', 'ALTERAR_VISUAL')),
  actor text not null,
  note text,
  created_at timestamptz not null default now()
);

-- 5. Inteligência Comercial — Acompanhamento Real de Interessados (Nunca inventa leads)
create table if not exists public.potential_customer_leads (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  contact_name text not null,
  instagram_handle text,
  interest_type text not null check (interest_type in ('mentoria', 'avaliacao_familiar', 'informacao')),
  source_post_id uuid references public.content_posts(id) on delete set null,
  channel text not null check (channel in ('direct', 'comentario', 'link_bio', 'whatsapp')),
  stage text not null default 'novo' check (stage in ('novo', 'em_conversa', 'agendado', 'concluido')),
  notes text,
  recorded_at timestamptz not null default now()
);

-- 6. Configurações da Automação Semanal (Preparação antes de Sábado)
create table if not exists public.automation_settings (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references public.brand_profiles(id) on delete cascade,
  enabled boolean not null default true,
  review_day text not null default 'sabado' check (review_day in ('sexta', 'sabado', 'domingo')),
  preparation_day text not null default 'sexta' check (preparation_day in ('quinta', 'sexta')),
  preparation_time text not null default '18:00',
  ready_time text not null default '08:00',
  posts_per_week integer not null default 7 check (posts_per_week between 1 and 14),
  notification_channel text not null default 'whatsapp' check (notification_channel in ('whatsapp', 'email', 'painel')),
  notification_recipient text not null default '',
  require_explicit_human_approval boolean not null default true check (require_explicit_human_approval = true),
  auto_publish_enabled boolean not null default false,
  category_mix jsonb not null default '{}'::jsonb,
  objective_mix jsonb not null default '{}'::jsonb,
  last_prepared_at timestamptz,
  next_preparation_at timestamptz,
  updated_at timestamptz not null default now()
);

-- 7. Snapshots de Métricas do Instagram (Distinção clara entre demo e live)
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

alter table public.brand_profiles enable row level security;
alter table public.media_assets enable row level security;
alter table public.content_posts enable row level security;
alter table public.approval_audit_logs enable row level security;
alter table public.potential_customer_leads enable row level security;
alter table public.automation_settings enable row level security;
alter table public.instagram_metrics_snapshots enable row level security;
