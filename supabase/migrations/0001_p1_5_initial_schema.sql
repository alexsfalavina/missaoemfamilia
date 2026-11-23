-- ============================================================================
-- JESSICA AI MARKETING — Migration 0001 (P1.5 — Supabase Free Tier Ready)
-- Provisiona tabelas, triggers, funções seguras, RLS (tabelas + Storage),
-- bucket jessica-media (50 MB) e referências dos 3 documentos oficiais (P2).
--
-- IMPORTANTE:
-- - Script 100% idempotente (pode ser reexecutado com segurança em DEV).
-- - Executar SOMENTE na instância de desenvolvimento antes de validar P1.5.
-- ============================================================================

create extension if not exists "pgcrypto";

-- Função auxiliar de timestamp automático (search_path travado por segurança)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- 1. Perfis de Usuário e Controle de Acesso (RBAC ligado ao Supabase Auth)
-- ============================================================================
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'viewer' check (role in ('owner', 'editor', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_authorized_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and active = true
  );
$$;

create or replace function public.can_edit_marketing()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and active = true and role in ('owner', 'editor')
  );
$$;

-- ============================================================================
-- 2. Perfil da Marca (Posicionamento profissional & dados comerciais verificados)
-- ============================================================================
create table if not exists public.brand_profiles (
  id text primary key default 'brand-jessica-nalin',
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

-- ============================================================================
-- 3. Registro de Documentos Oficiais da Base de Conhecimento (Preparado para P2)
-- Preserva versões, referências e regras editoriais sem inventar conteúdo.
-- ============================================================================
create table if not exists public.knowledge_documents (
  id text primary key,
  brand_profile_id text not null default 'brand-jessica-nalin'
    references public.brand_profiles(id) on delete cascade,
  title text not null,
  version text not null,
  slug text not null unique,
  status text not null default 'aguardando_importacao_p2'
    check (status in ('aguardando_importacao_p2', 'ativo', 'arquivado')),
  description text not null default '',
  source_content text, -- Preenchido apenas com importação oficial na P2
  content_sha256 text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- 4. Lotes Semanais Versionados (Histórico persistente sem sobrescrita)
-- ============================================================================
create table if not exists public.weekly_batches (
  id text primary key,
  brand_profile_id text not null default 'brand-jessica-nalin'
    references public.brand_profiles(id) on delete cascade,
  week_label text not null,
  week_start_date date not null,
  week_end_date date not null,
  focus_theme text,
  status text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  created_by text not null default 'Jessica Nalin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_weekly_batches_status on public.weekly_batches(status);
create index if not exists idx_weekly_batches_start on public.weekly_batches(week_start_date desc);

-- ============================================================================
-- 5. Publicações Semanais (Ligadas ao Lote + Preparadas para Metricool futuro)
-- ============================================================================
create table if not exists public.content_posts (
  id text primary key,
  brand_profile_id text not null default 'brand-jessica-nalin'
    references public.brand_profiles(id) on delete cascade,
  batch_id text not null references public.weekly_batches(id) on delete cascade,
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
    check (publishing_state in ('nao_publicado', 'bloqueado_sem_integracao', 'agendado_metricool', 'publicado')),
  external_provider text check (external_provider in ('metricool')),
  external_post_id text,
  scheduled_external_at timestamptz,
  published_at timestamptz,
  data_source text not null default 'demo' check (data_source in ('demo', 'live')),
  story_execution_mode text check (story_execution_mode in ('publicacao_automatica', 'acao_manual_instagram')),
  story_manual_instructions text,
  slides jsonb not null default '[]'::jsonb,
  reels_script jsonb,
  reels_production jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_content_posts_batch_id on public.content_posts(batch_id);
create index if not exists idx_content_posts_status on public.content_posts(status);
create index if not exists idx_content_posts_recommended_date on public.content_posts(recommended_date);

-- ============================================================================
-- 6. Biblioteca de Mídia Autêntica + Associação a Conteúdos e Lotes
-- ============================================================================
create table if not exists public.media_assets (
  id text primary key,
  brand_profile_id text not null default 'brand-jessica-nalin'
    references public.brand_profiles(id) on delete cascade,
  name text not null,
  category text not null check (category in ('foto_pessoal', 'foto_profissional', 'video', 'logo_marca', 'material_existente')),
  authenticity text not null check (authenticity in ('autentico_jessica', 'logo_oficial', 'ilustracao_demo')),
  url text not null,
  storage_path text,
  storage_provider text not null default 'supabase_storage'
    check (storage_provider in ('local', 'supabase_storage')),
  mime_type text not null,
  file_size_bytes bigint,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.media_associations (
  id uuid primary key default gen_random_uuid(),
  media_asset_id text not null references public.media_assets(id) on delete cascade,
  batch_id text references public.weekly_batches(id) on delete cascade,
  post_id text references public.content_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint media_assoc_target_check check (batch_id is not null or post_id is not null)
);

create index if not exists idx_media_assoc_asset on public.media_associations(media_asset_id);
create index if not exists idx_media_assoc_post on public.media_associations(post_id);
create index if not exists idx_media_assoc_batch on public.media_associations(batch_id);
create unique index if not exists uq_media_assoc_batch
  on public.media_associations(media_asset_id, batch_id)
  where batch_id is not null and post_id is null;
create unique index if not exists uq_media_assoc_post
  on public.media_associations(media_asset_id, post_id)
  where post_id is not null and batch_id is null;
create unique index if not exists uq_media_assoc_batch_post
  on public.media_associations(media_asset_id, batch_id, post_id)
  where batch_id is not null and post_id is not null;

-- ============================================================================
-- 7. Auditoria Persistente e Imutável de Aprovações, Edições e Exclusões
--    (ON DELETE SET NULL + snapshots preservam 100% do histórico mesmo após exclusão de post)
-- ============================================================================
create table if not exists public.approval_audit_logs (
  id text primary key,
  post_id text references public.content_posts(id) on delete set null,
  post_id_snapshot text not null default '',
  post_title_snapshot text,
  action text not null check (action in ('APROVAR', 'SOLICITAR_ALTERACOES', 'REJEITAR', 'REAGENDAR', 'EDITAR', 'REGENERAR', 'ALTERAR_TOM', 'ALTERAR_VISUAL', 'EXCLUIR')),
  actor text not null,
  actor_email text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_post_id on public.approval_audit_logs(post_id, created_at desc);
create index if not exists idx_audit_post_snapshot on public.approval_audit_logs(post_id_snapshot, created_at desc);

create or replace function public.protect_approval_audit_logs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Exclusão de registros em approval_audit_logs não é permitida (trilha imutável).';
  end if;

  if tg_op = 'UPDATE' then
    -- Permite exclusivamente o ON DELETE SET NULL automático do PostgreSQL em post_id,
    -- preservando intactos todos os demais campos do registro de auditoria.
    if new.post_id is null
      and old.post_id is not null
      and new.id = old.id
      and new.post_id_snapshot is not distinct from old.post_id_snapshot
      and new.post_title_snapshot is not distinct from old.post_title_snapshot
      and new.action = old.action
      and new.actor = old.actor
      and new.actor_email is not distinct from old.actor_email
      and new.note is not distinct from old.note
      and new.created_at = old.created_at
    then
      return new;
    end if;

    raise exception 'Alteração de registros em approval_audit_logs não é permitida (trilha imutável).';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_approval_audit_logs on public.approval_audit_logs;
create trigger trg_protect_approval_audit_logs
  before update or delete on public.approval_audit_logs
  for each row execute function public.protect_approval_audit_logs();

-- ============================================================================
-- 8. Inteligência Comercial — Interessados Reais (Nunca inventa leads)
-- ============================================================================
create table if not exists public.potential_customer_leads (
  id text primary key,
  brand_profile_id text not null default 'brand-jessica-nalin'
    references public.brand_profiles(id) on delete cascade,
  contact_name text not null,
  instagram_handle text,
  interest_type text not null check (interest_type in ('mentoria', 'avaliacao_familiar', 'informacao')),
  source_post_id text references public.content_posts(id) on delete set null,
  source_post_title text,
  channel text not null check (channel in ('direct', 'comentario', 'link_bio', 'whatsapp')),
  stage text not null default 'novo' check (stage in ('novo', 'em_conversa', 'agendado', 'concluido')),
  notes text,
  recorded_at timestamptz not null default now()
);

-- ============================================================================
-- 9. Automação Semanal & Snapshots de Métricas (Preparado para Metricool)
-- ============================================================================
create table if not exists public.automation_settings (
  id text primary key default 'automation-default',
  brand_profile_id text not null default 'brand-jessica-nalin'
    references public.brand_profiles(id) on delete cascade,
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

create table if not exists public.instagram_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id text not null default 'brand-jessica-nalin'
    references public.brand_profiles(id) on delete cascade,
  instagram_handle text not null default '@eujessynalin',
  source_provider text not null default 'demo' check (source_provider in ('demo', 'metricool')),
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

-- Triggers de updated_at
drop trigger if exists trg_user_profiles_updated on public.user_profiles;
create trigger trg_user_profiles_updated before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_brand_profiles_updated on public.brand_profiles;
create trigger trg_brand_profiles_updated before update on public.brand_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_knowledge_documents_updated on public.knowledge_documents;
create trigger trg_knowledge_documents_updated before update on public.knowledge_documents
  for each row execute function public.set_updated_at();

drop trigger if exists trg_weekly_batches_updated on public.weekly_batches;
create trigger trg_weekly_batches_updated before update on public.weekly_batches
  for each row execute function public.set_updated_at();

drop trigger if exists trg_content_posts_updated on public.content_posts;
create trigger trg_content_posts_updated before update on public.content_posts
  for each row execute function public.set_updated_at();

drop trigger if exists trg_automation_settings_updated on public.automation_settings;
create trigger trg_automation_settings_updated before update on public.automation_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- 10. Row Level Security (RLS) & Políticas Idempotentes de Acesso
-- ============================================================================
alter table public.user_profiles enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.weekly_batches enable row level security;
alter table public.content_posts enable row level security;
alter table public.media_assets enable row level security;
alter table public.media_associations enable row level security;
alter table public.approval_audit_logs enable row level security;
alter table public.potential_customer_leads enable row level security;
alter table public.automation_settings enable row level security;
alter table public.instagram_metrics_snapshots enable row level security;

-- user_profiles: cada membro lê apenas seu próprio perfil (impede auto-escalação de role)
drop policy if exists "members_read_own_profile" on public.user_profiles;
create policy "members_read_own_profile" on public.user_profiles
  for select to authenticated using (id = auth.uid());

-- brand_profiles
drop policy if exists "members_read_brand" on public.brand_profiles;
create policy "members_read_brand" on public.brand_profiles
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_brand" on public.brand_profiles;
create policy "editors_write_brand" on public.brand_profiles
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- knowledge_documents
drop policy if exists "members_read_knowledge" on public.knowledge_documents;
create policy "members_read_knowledge" on public.knowledge_documents
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_knowledge" on public.knowledge_documents;
create policy "editors_write_knowledge" on public.knowledge_documents
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- weekly_batches
drop policy if exists "members_read_batches" on public.weekly_batches;
create policy "members_read_batches" on public.weekly_batches
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_batches" on public.weekly_batches;
create policy "editors_write_batches" on public.weekly_batches
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- content_posts
drop policy if exists "members_read_posts" on public.content_posts;
create policy "members_read_posts" on public.content_posts
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_posts" on public.content_posts;
create policy "editors_write_posts" on public.content_posts
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- media_assets
drop policy if exists "members_read_media" on public.media_assets;
create policy "members_read_media" on public.media_assets
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_media" on public.media_assets;
create policy "editors_write_media" on public.media_assets
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- media_associations
drop policy if exists "members_read_media_assoc" on public.media_associations;
create policy "members_read_media_assoc" on public.media_associations
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_media_assoc" on public.media_associations;
create policy "editors_write_media_assoc" on public.media_associations
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- approval_audit_logs (append-only: somente leitura para membros e insert para owner/editor)
drop policy if exists "members_read_audit" on public.approval_audit_logs;
create policy "members_read_audit" on public.approval_audit_logs
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_insert_audit" on public.approval_audit_logs;
create policy "editors_insert_audit" on public.approval_audit_logs
  for insert to authenticated with check (public.can_edit_marketing());

-- potential_customer_leads
drop policy if exists "members_read_leads" on public.potential_customer_leads;
create policy "members_read_leads" on public.potential_customer_leads
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_leads" on public.potential_customer_leads;
create policy "editors_write_leads" on public.potential_customer_leads
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- automation_settings
drop policy if exists "members_read_automation" on public.automation_settings;
create policy "members_read_automation" on public.automation_settings
  for select to authenticated using (public.is_authorized_member());
drop policy if exists "editors_write_automation" on public.automation_settings;
create policy "editors_write_automation" on public.automation_settings
  for all to authenticated using (public.can_edit_marketing()) with check (public.can_edit_marketing());

-- instagram_metrics_snapshots
drop policy if exists "members_read_metrics" on public.instagram_metrics_snapshots;
create policy "members_read_metrics" on public.instagram_metrics_snapshots
  for select to authenticated using (public.is_authorized_member());

-- ============================================================================
-- 11. Bucket Privado Supabase Storage & Políticas RLS (Upload Direto até 50 MB)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jessica-media',
  'jessica-media',
  false,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "jessica_media_public_read" on storage.objects;
drop policy if exists "jessica_media_members_read" on storage.objects;
create policy "jessica_media_members_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'jessica-media' and public.is_authorized_member());

drop policy if exists "jessica_media_editors_insert" on storage.objects;
create policy "jessica_media_editors_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'jessica-media' and public.can_edit_marketing());

drop policy if exists "jessica_media_editors_update" on storage.objects;
create policy "jessica_media_editors_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'jessica-media' and public.can_edit_marketing())
  with check (bucket_id = 'jessica-media' and public.can_edit_marketing());

drop policy if exists "jessica_media_editors_delete" on storage.objects;
create policy "jessica_media_editors_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'jessica-media' and public.can_edit_marketing());

-- ============================================================================
-- 12. Registro Base da Marca + 3 Documentos Oficiais (Somente Referência — P2)
-- Garante integridade referencial (FK brand_profile_id) em bancos recém-criados.
-- ============================================================================
insert into public.brand_profiles (
  id,
  brand_name,
  instagram_handle,
  instagram_url,
  niche,
  target_audience,
  brand_voice
)
values (
  'brand-jessica-nalin',
  'Jessica Nalin',
  '@eujessynalin',
  'https://www.instagram.com/eujessynalin/',
  'Educação parental, desenvolvimento infantil e mentoria familiar',
  'Mães e pais de crianças e pré-adolescentes (28 a 48 anos) que buscam orientação estruturada, respeitosa e prática.',
  'Profissional, acolhedor, claro e realista.'
)
on conflict (id) do nothing;

insert into public.knowledge_documents (id, brand_profile_id, title, version, slug, status, description)
values
  (
    'doc-mapa-conhecimento-v1-1',
    'brand-jessica-nalin',
    'MAPA DE CONHECIMENTO — JESSICA NALIN — VERSÃO 1.1',
    '1.1',
    'mapa-de-conhecimento-jessica-nalin-v1-1',
    'aguardando_importacao_p2',
    'Documento oficial de base de conhecimento. Conteúdo será importado integralmente na P2 sem alteração.'
  ),
  (
    'doc-auditoria-conformidade-v1-1',
    'brand-jessica-nalin',
    'AUDITORIA CRÍTICA E PROTOCOLO DE CONFORMIDADE — VERSÃO 1.1',
    '1.1',
    'auditoria-critica-protocolo-conformidade-v1-1',
    'aguardando_importacao_p2',
    'Documento oficial de conformidade editorial e veracidade. Conteúdo será importado integralmente na P2 sem alteração.'
  ),
  (
    'doc-dna-editorial-v1-3',
    'brand-jessica-nalin',
    'DNA EDITORIAL E ESTRATÉGIA DE MARCA — JESSICA NALIN — VERSÃO 1.3',
    '1.3',
    'dna-editorial-estrategia-marca-jessica-nalin-v1-3',
    'aguardando_importacao_p2',
    'Documento oficial de DNA editorial e estratégia da marca. Conteúdo será importado integralmente na P2 sem alteração.'
  )
on conflict (id) do nothing;
