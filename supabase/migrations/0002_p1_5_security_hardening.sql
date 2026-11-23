-- ============================================================================
-- JESSICA AI MARKETING — Migration 0002 (P1.5 — Security & Audit Hardening)
-- Migration incremental, atômica, idempotente e não destrutiva.
--
-- Objetivo:
-- Atualizar qualquer banco que já tenha recebido uma versão anterior da
-- migration 0001 (ou executar com segurança sobre a 0001 atualizada) para o
-- estado final consolidado em src/lib/supabase/schema.sql, sem apagar dados.
--
-- Alterações aplicadas:
-- 1. approval_audit_logs:
--    - Adiciona colunas de snapshot (post_id_snapshot, post_title_snapshot)
--      e faz backfill automático dos registros históricos existentes.
--    - Altera post_id para nullable e substitui a FK ON DELETE CASCADE por
--      ON DELETE SET NULL (preserva 100% da auditoria após exclusão de post).
--    - Atualiza o CHECK de action para incluir o evento 'EXCLUIR'.
--    - Cria índice idx_audit_post_snapshot e trigger de imutabilidade
--      trg_protect_approval_audit_logs (bloqueia DELETE e UPDATE indevido).
-- 2. Storage privado (bucket jessica-media):
--    - Garante public = false, limite 50 MB e MIME types restritos.
--    - Remove política pública legada (jessica_media_public_read) e garante
--      políticas autenticadas (members_read + editors insert/update/delete).
-- 3. Funções, triggers e índices únicos auxiliares:
--    - Garante set search_path = public nas funções auxiliares/SECURITY DEFINER.
--    - Garante triggers updated_at em user_profiles e knowledge_documents.
--    - Garante os 3 índices únicos parciais em media_associations.
-- ============================================================================

-- ============================================================================
-- 1. Funções auxiliares com search_path travado por segurança
-- ============================================================================
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
-- 2. Hardening da trilha imutável de auditoria (approval_audit_logs)
-- ============================================================================

-- Remove temporariamente o trigger de imutabilidade (caso já exista em reexecução)
-- para permitir backfill idempotente apenas em linhas sem snapshot; será recriado abaixo.
drop trigger if exists trg_protect_approval_audit_logs on public.approval_audit_logs;

-- 2.1 Novas colunas de snapshot (não destrutivas)
alter table public.approval_audit_logs
  add column if not exists post_id_snapshot text not null default '',
  add column if not exists post_title_snapshot text;

-- 2.2 Backfill seguro dos registros existentes (preserva 100% dos dados legados)
update public.approval_audit_logs as a
set
  post_id_snapshot = case
    when a.post_id_snapshot = '' and a.post_id is not null then a.post_id
    else a.post_id_snapshot
  end,
  post_title_snapshot = coalesce(a.post_title_snapshot, p.title)
from public.content_posts as p
where a.post_id = p.id
  and (a.post_id_snapshot = '' or a.post_title_snapshot is null);

update public.approval_audit_logs
set post_id_snapshot = post_id
where post_id_snapshot = ''
  and post_id is not null;

-- 2.3 Permite post_id NULL e substitui qualquer FK anterior (CASCADE) por ON DELETE SET NULL
alter table public.approval_audit_logs
  alter column post_id drop not null;

do $$
declare
  fk_name text;
begin
  for fk_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'approval_audit_logs'
      and c.contype = 'f'
      and c.confrelid = 'public.content_posts'::regclass
  loop
    execute format('alter table public.approval_audit_logs drop constraint if exists %I', fk_name);
  end loop;
end
$$;

alter table public.approval_audit_logs
  add constraint approval_audit_logs_post_id_fkey
  foreign key (post_id) references public.content_posts(id) on delete set null;

-- 2.4 Atualiza o CHECK de action para incluir o evento 'EXCLUIR'
do $$
declare
  chk_name text;
begin
  for chk_name in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'approval_audit_logs'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%action%'
  loop
    execute format('alter table public.approval_audit_logs drop constraint if exists %I', chk_name);
  end loop;
end
$$;

alter table public.approval_audit_logs
  add constraint approval_audit_logs_action_check
  check (
    action in (
      'APROVAR',
      'SOLICITAR_ALTERACOES',
      'REJEITAR',
      'REAGENDAR',
      'EDITAR',
      'REGENERAR',
      'ALTERAR_TOM',
      'ALTERAR_VISUAL',
      'EXCLUIR'
    )
  );

-- 2.5 Índice para consulta rápida por snapshot após exclusão de post
create index if not exists idx_audit_post_snapshot
  on public.approval_audit_logs(post_id_snapshot, created_at desc);

-- 2.6 Função e trigger de imutabilidade (bloqueia DELETE e UPDATE indevido)
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

create trigger trg_protect_approval_audit_logs
  before update or delete on public.approval_audit_logs
  for each row execute function public.protect_approval_audit_logs();

-- ============================================================================
-- 3. Triggers de updated_at e índices únicos parciais em media_associations
-- ============================================================================
drop trigger if exists trg_user_profiles_updated on public.user_profiles;
create trigger trg_user_profiles_updated before update on public.user_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_knowledge_documents_updated on public.knowledge_documents;
create trigger trg_knowledge_documents_updated before update on public.knowledge_documents
  for each row execute function public.set_updated_at();

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
-- 4. Bucket privado jessica-media & políticas RLS de storage.objects
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
