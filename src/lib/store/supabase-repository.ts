import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApprovalAuditEntry,
  ApprovalStatus,
  AutomationSettings,
  BrandProfile,
  ContentPost,
  KnowledgeDocumentRef,
  LeadInterestType,
  LeadStage,
  MediaAsset,
  PotentialCustomerLead,
  ReelsProductionWorkflow,
  WeeklyBatch,
} from '@/types/marketing';
import { createDemoSeedData, OFFICIAL_KNOWLEDGE_DOCUMENTS } from '@/lib/data/demo-seed';
import { getSupabaseAdminClient, getSupabaseServerConfig } from '@/lib/supabase/client';
import { addDaysIso, formatPtDateShort, getWeekdayNameFromDate } from '@/lib/constants/labels';

function requireClient(): SupabaseClient {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error('Supabase não configurado no servidor.');
  }
  return client;
}

function mapBrandRow(row: Record<string, unknown>): BrandProfile {
  const seed = createDemoSeedData().brandProfile;
  return {
    id: String(row.id || seed.id),
    brandName: String(row.brand_name || seed.brandName),
    instagramHandle: String(row.instagram_handle || seed.instagramHandle),
    instagramUrl: String(row.instagram_url || seed.instagramUrl),
    niche: String(row.niche || seed.niche),
    positioningPillars: Array.isArray(row.positioning_pillars)
      ? (row.positioning_pillars as string[])
      : seed.positioningPillars,
    targetAudience: String(row.target_audience || seed.targetAudience),
    servicesOffered: Array.isArray(row.services_offered)
      ? (row.services_offered as string[])
      : seed.servicesOffered,
    verifiedCommercialInfo: {
      ...seed.verifiedCommercialInfo,
      ...((row.verified_commercial_info as Record<string, string>) || {}),
    },
    brandVoice: String(row.brand_voice || seed.brandVoice),
    brandValues: Array.isArray(row.brand_values)
      ? (row.brand_values as string[])
      : seed.brandValues,
    visualIdentity: {
      ...seed.visualIdentity,
      ...((row.visual_identity as Record<string, string>) || {}),
    },
    businessObjectives: Array.isArray(row.business_objectives)
      ? (row.business_objectives as string[])
      : seed.businessObjectives,
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapBatchRow(row: Record<string, unknown>): WeeklyBatch {
  return {
    id: String(row.id),
    weekLabel: String(row.week_label),
    weekStartDate: String(row.week_start_date),
    weekEndDate: String(row.week_end_date),
    focusTheme: row.focus_theme ? String(row.focus_theme) : undefined,
    status: row.status === 'arquivado' ? 'arquivado' : 'ativo',
    createdBy: String(row.created_by || 'Jessica Nalin'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapPostRow(
  row: Record<string, unknown>,
  auditLogs: ApprovalAuditEntry[]
): ContentPost {
  return {
    id: String(row.id),
    batchId: String(row.batch_id),
    weekLabel: String(row.week_label),
    dayOfWeek: String(row.day_of_week),
    title: String(row.title),
    category: row.category as ContentPost['category'],
    strategicObjective: row.strategic_objective as ContentPost['strategicObjective'],
    toneProfile: (row.tone_profile as ContentPost['toneProfile']) || 'acolhedor_sereno',
    format: row.format as ContentPost['format'],
    aspectRatio: row.aspect_ratio as ContentPost['aspectRatio'],
    definedAudience: String(row.defined_audience || ''),
    openingHook: String(row.opening_hook || ''),
    educationalValue: String(row.educational_value || ''),
    marketingObjective: String(row.marketing_objective || ''),
    conversionFocus: String(row.conversion_focus || ''),
    serviceConnection: row.service_connection ? String(row.service_connection) : undefined,
    caption: String(row.caption || ''),
    hashtags: Array.isArray(row.hashtags) ? (row.hashtags as string[]) : [],
    cta: String(row.cta || ''),
    recommendedDate: String(row.recommended_date),
    recommendedTime: String(row.recommended_time),
    status: row.status as ApprovalStatus,
    approvalFeedback: row.approval_feedback ? String(row.approval_feedback) : undefined,
    approvedAt: row.approved_at ? String(row.approved_at) : undefined,
    approvedBy: row.approved_by ? String(row.approved_by) : undefined,
    publishingState: 'bloqueado_sem_integracao',
    externalProvider: (row.external_provider as 'metricool' | null) ?? null,
    externalPostId: row.external_post_id ? String(row.external_post_id) : null,
    dataSource: (row.data_source as 'demo' | 'live') || 'demo',
    storyExecutionMode: (row.story_execution_mode as ContentPost['storyExecutionMode']) || undefined,
    storyManualInstructions: row.story_manual_instructions
      ? String(row.story_manual_instructions)
      : undefined,
    slides: Array.isArray(row.slides) ? (row.slides as ContentPost['slides']) : [],
    reelsScript: Array.isArray(row.reels_script)
      ? (row.reels_script as ContentPost['reelsScript'])
      : undefined,
    reelsProduction: (row.reels_production as ReelsProductionWorkflow) || undefined,
    auditLog: auditLogs,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function postToRow(post: ContentPost): Record<string, unknown> {
  return {
    id: post.id,
    brand_profile_id: 'brand-jessica-nalin',
    batch_id: post.batchId,
    week_label: post.weekLabel,
    day_of_week: post.dayOfWeek,
    title: post.title,
    category: post.category,
    strategic_objective: post.strategicObjective,
    tone_profile: post.toneProfile,
    format: post.format,
    aspect_ratio: post.aspectRatio,
    defined_audience: post.definedAudience,
    opening_hook: post.openingHook,
    educational_value: post.educationalValue,
    marketing_objective: post.marketingObjective,
    conversion_focus: post.conversionFocus,
    service_connection: post.serviceConnection ?? null,
    caption: post.caption,
    hashtags: post.hashtags,
    cta: post.cta,
    recommended_date: post.recommendedDate,
    recommended_time: post.recommendedTime,
    status: post.status,
    approval_feedback: post.approvalFeedback ?? null,
    approved_at: post.approvedAt ?? null,
    approved_by: post.approvedBy ?? null,
    publishing_state: 'bloqueado_sem_integracao',
    external_provider: post.externalProvider ?? null,
    external_post_id: post.externalPostId ?? null,
    data_source: post.dataSource,
    story_execution_mode: post.storyExecutionMode ?? null,
    story_manual_instructions: post.storyManualInstructions ?? null,
    slides: post.slides,
    reels_script: post.reelsScript ?? null,
    reels_production: post.reelsProduction ?? null,
  };
}

let seededOnce = false;
let seedPromise: Promise<void> | null = null;

function throwIfError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`Supabase (${context}): ${error.message}`);
  }
}

/**
 * Trava obrigatória contra inserção automática de dados demonstrativos em produção.
 * - Em produção (NODE_ENV, APP_ENV ou VERCEL_ENV = 'production'): SEMPRE false.
 * - Fora de produção: exige opt-in explícito ALLOW_DEMO_SEED=true no servidor (padrão false).
 */
export function isSupabaseDemoSeedAllowed(): boolean {
  const nodeEnv = process.env['NODE_ENV']?.trim().toLowerCase();
  const appEnv = process.env['APP_ENV']?.trim().toLowerCase();
  const vercelEnv = process.env['VERCEL_ENV']?.trim().toLowerCase();

  if (nodeEnv === 'production' || appEnv === 'production' || vercelEnv === 'production') {
    return false;
  }

  return process.env['ALLOW_DEMO_SEED']?.trim().toLowerCase() === 'true';
}

export async function ensureSupabaseSeeded(options?: { forceCheck?: boolean }): Promise<void> {
  if (seededOnce && !options?.forceCheck) return;
  if (seedPromise && !options?.forceCheck) return seedPromise;

  const run = (async () => {
    const db = requireClient();
    const seed = createDemoSeedData();
    const bp = seed.brandProfile;
    const as = seed.automationSettings;

    // 1. Bootstrap estrutural seguro e idempotente (ZERO dados de demonstração):
    //    garante brand_profiles base, as 3 referências oficiais P2 e automation_settings padrão.
    const brandRes = await db.from('brand_profiles').upsert(
      {
        id: bp.id,
        brand_name: bp.brandName,
        instagram_handle: bp.instagramHandle,
        instagram_url: bp.instagramUrl,
        niche: bp.niche,
        positioning_pillars: bp.positioningPillars,
        target_audience: bp.targetAudience,
        services_offered: bp.servicesOffered,
        verified_commercial_info: bp.verifiedCommercialInfo,
        brand_voice: bp.brandVoice,
        brand_values: bp.brandValues,
        visual_identity: bp.visualIdentity,
        business_objectives: bp.businessObjectives,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    throwIfError(brandRes.error, 'bootstrap brand_profiles');

    const docsRes = await db.from('knowledge_documents').upsert(
      OFFICIAL_KNOWLEDGE_DOCUMENTS.map((d) => ({
        id: d.id,
        brand_profile_id: bp.id,
        title: d.title,
        version: d.version,
        slug: d.slug,
        status: d.status,
        description: d.description,
      })),
      { onConflict: 'id', ignoreDuplicates: true }
    );
    throwIfError(docsRes.error, 'bootstrap knowledge_documents');

    const autoRes = await db.from('automation_settings').upsert(
      {
        id: as.id,
        brand_profile_id: bp.id,
        enabled: false,
        review_day: 'sabado',
        preparation_day: 'sexta',
        preparation_time: '18:00',
        ready_time: '08:00',
        posts_per_week: 7,
        notification_channel: 'whatsapp',
        notification_recipient: '',
        require_explicit_human_approval: true,
        auto_publish_enabled: false,
        category_mix: as.categoryMix,
        objective_mix: as.objectiveMix,
        last_prepared_at: null,
        next_preparation_at: null,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    throwIfError(autoRes.error, 'bootstrap automation_settings');

    // 2. Seed demonstrativo (lote, posts e mídias demo):
    //    BLOQUEADO em produção e desabilitado por padrão (requer ALLOW_DEMO_SEED=true fora de produção).
    if (isSupabaseDemoSeedAllowed()) {
      const { data: existingBatches, error } = await db
        .from('weekly_batches')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(
          `Erro ao consultar Supabase (execute a migration 0001 primeiro): ${error.message}`
        );
      }

      if (!existingBatches || existingBatches.length === 0) {
        const b0 = seed.batches[0];
        const batchRes = await db.from('weekly_batches').upsert(
          {
            id: b0.id,
            brand_profile_id: bp.id,
            week_label: b0.weekLabel,
            week_start_date: b0.weekStartDate,
            week_end_date: b0.weekEndDate,
            focus_theme: b0.focusTheme ?? null,
            status: b0.status,
            created_by: b0.createdBy,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
        throwIfError(batchRes.error, 'seed weekly_batches');

        const postsRes = await db
          .from('content_posts')
          .upsert(seed.posts.map(postToRow), { onConflict: 'id', ignoreDuplicates: true });
        throwIfError(postsRes.error, 'seed content_posts');

        const mediaRes = await db.from('media_assets').upsert(
          seed.mediaLibrary.map((m) => ({
            id: m.id,
            brand_profile_id: bp.id,
            name: m.name,
            category: m.category,
            authenticity: m.authenticity,
            url: m.url,
            storage_path: m.storagePath ?? null,
            storage_provider: m.storageProvider,
            mime_type: m.mimeType,
            file_size_bytes: m.fileSizeBytes ?? null,
            notes: m.notes ?? null,
          })),
          { onConflict: 'id', ignoreDuplicates: true }
        );
        throwIfError(mediaRes.error, 'seed media_assets');

        for (const m of seed.mediaLibrary) {
          for (const batchId of m.linkedBatchIds) {
            const r = await db
              .from('media_associations')
              .insert({ media_asset_id: m.id, batch_id: batchId });
            if (r.error && r.error.code !== '23505') {
              throwIfError(r.error, 'seed media_associations batch');
            }
          }
          for (const postId of m.linkedPostIds) {
            const r = await db
              .from('media_associations')
              .insert({ media_asset_id: m.id, post_id: postId });
            if (r.error && r.error.code !== '23505') {
              throwIfError(r.error, 'seed media_associations post');
            }
          }
        }
      }
    }

    seededOnce = true;
  })().finally(() => {
    if (seedPromise === run) {
      seedPromise = null;
    }
  });

  if (!options?.forceCheck) {
    seedPromise = run;
  }

  return run;
}

export async function sbGetBrandProfile(): Promise<BrandProfile> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { data, error } = await db
    .from('brand_profiles')
    .select('*')
    .eq('id', 'brand-jessica-nalin')
    .single();
  if (error || !data) throw new Error(error?.message || 'Perfil não encontrado.');
  return mapBrandRow(data);
}

export async function sbUpdateBrandProfile(partial: Partial<BrandProfile>): Promise<BrandProfile> {
  const current = await sbGetBrandProfile();
  const next: BrandProfile = {
    ...current,
    ...partial,
    id: current.id,
    verifiedCommercialInfo: {
      ...current.verifiedCommercialInfo,
      ...(partial.verifiedCommercialInfo ?? {}),
    },
    visualIdentity: {
      ...current.visualIdentity,
      ...(partial.visualIdentity ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };

  const db = requireClient();
  const { data, error } = await db
    .from('brand_profiles')
    .update({
      brand_name: next.brandName,
      instagram_handle: next.instagramHandle,
      instagram_url: next.instagramUrl,
      niche: next.niche,
      positioning_pillars: next.positioningPillars,
      target_audience: next.targetAudience,
      services_offered: next.servicesOffered,
      verified_commercial_info: next.verifiedCommercialInfo,
      brand_voice: next.brandVoice,
      brand_values: next.brandValues,
      visual_identity: next.visualIdentity,
      business_objectives: next.businessObjectives,
    })
    .eq('id', current.id)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Erro ao atualizar marca.');
  return mapBrandRow(data);
}

export async function sbListKnowledgeDocuments(): Promise<KnowledgeDocumentRef[]> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { data } = await db.from('knowledge_documents').select('*').order('id');
  if (!data || data.length === 0) return OFFICIAL_KNOWLEDGE_DOCUMENTS;
  return data.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    version: String(row.version),
    slug: String(row.slug),
    status: (row.status as KnowledgeDocumentRef['status']) || 'aguardando_importacao_p2',
    description: String(row.description || ''),
    importedAt: row.imported_at ? String(row.imported_at) : undefined,
  }));
}

export async function sbListBatches(): Promise<WeeklyBatch[]> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { data, error } = await db
    .from('weekly_batches')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBatchRow);
}

export async function sbCreateBatchWithPosts(input: {
  weekStartDate: string;
  focusTheme?: string;
  createdBy: string;
  posts: ContentPost[];
}): Promise<{ batch: WeeklyBatch; posts: ContentPost[] }> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const now = new Date().toISOString();
  const weekEndDate = addDaysIso(input.weekStartDate, 6);
  const weekLabel = `Semana de ${formatPtDateShort(input.weekStartDate)} a ${formatPtDateShort(weekEndDate)}`;
  const batchId = input.posts[0]?.batchId || `batch-${input.weekStartDate}-${Date.now()}`;

  // Arquiva lotes anteriores (NUNCA sobrescreve histórico!)
  const archRes = await db
    .from('weekly_batches')
    .update({ status: 'arquivado' })
    .eq('status', 'ativo');
  throwIfError(archRes.error, 'archive previous weekly_batches');

  const { data: batchRow, error: bErr } = await db
    .from('weekly_batches')
    .insert({
      id: batchId,
      brand_profile_id: 'brand-jessica-nalin',
      week_label: weekLabel,
      week_start_date: input.weekStartDate,
      week_end_date: weekEndDate,
      focus_theme: input.focusTheme?.trim() || null,
      status: 'ativo',
      created_by: input.createdBy,
    })
    .select('*')
    .single();
  if (bErr || !batchRow) throw new Error(bErr?.message || 'Erro ao criar lote semanal.');

  const preparedPosts = input.posts.map((p) => ({
    ...p,
    batchId,
    weekLabel,
    status: 'aguardando_aprovacao' as ApprovalStatus,
    publishingState: 'bloqueado_sem_integracao' as const,
  }));

  if (preparedPosts.length > 0) {
    const { error: pErr } = await db.from('content_posts').insert(preparedPosts.map(postToRow));
    if (pErr) throw new Error(pErr.message);
  }

  await db
    .from('automation_settings')
    .update({ last_prepared_at: now })
    .eq('id', 'automation-default');

  return { batch: mapBatchRow(batchRow), posts: preparedPosts };
}

export async function sbListPosts(filters?: {
  batchId?: string;
  status?: ApprovalStatus | 'todos';
  category?: string;
  format?: string;
  includeAllBatches?: boolean;
}): Promise<ContentPost[]> {
  await ensureSupabaseSeeded();
  const db = requireClient();

  let targetBatchId = filters?.batchId;
  if (!targetBatchId && !filters?.includeAllBatches) {
    const batches = await sbListBatches();
    const active = batches.find((b) => b.status === 'ativo') ?? batches[0];
    if (!active) return [];
    targetBatchId = active.id;
  }

  let query = db.from('content_posts').select('*');
  if (targetBatchId && targetBatchId !== 'todos') {
    query = query.eq('batch_id', targetBatchId);
  }
  if (filters?.status && filters.status !== 'todos') {
    query = query.eq('status', filters.status);
  }
  if (filters?.category && filters.category !== 'todos') {
    query = query.eq('category', filters.category);
  }
  if (filters?.format && filters.format !== 'todos') {
    query = query.eq('format', filters.format);
  }

  const { data: postRows, error } = await query
    .order('recommended_date', { ascending: true })
    .order('recommended_time', { ascending: true });
  if (error) throw new Error(error.message);

  const ids = (postRows ?? []).map((r) => String(r.id));
  const auditByPost = new Map<string, ApprovalAuditEntry[]>();
  if (ids.length > 0) {
    const { data: auditRows } = await db
      .from('approval_audit_logs')
      .select('*')
      .in('post_id', ids)
      .order('created_at', { ascending: false });
    for (const a of auditRows ?? []) {
      const pid = String(a.post_id);
      const list = auditByPost.get(pid) ?? [];
      list.push({
        id: String(a.id),
        action: a.action as ApprovalAuditEntry['action'],
        actor: String(a.actor),
        actorEmail: a.actor_email ? String(a.actor_email) : undefined,
        note: a.note ? String(a.note) : undefined,
        createdAt: String(a.created_at),
      });
      auditByPost.set(pid, list);
    }
  }

  return (postRows ?? []).map((r) => mapPostRow(r, auditByPost.get(String(r.id)) ?? []));
}

export async function sbGetPostById(id: string): Promise<ContentPost | null> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { data } = await db.from('content_posts').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const { data: auditRows } = await db
    .from('approval_audit_logs')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: false });
  const logs: ApprovalAuditEntry[] = (auditRows ?? []).map((a) => ({
    id: String(a.id),
    action: a.action as ApprovalAuditEntry['action'],
    actor: String(a.actor),
    actorEmail: a.actor_email ? String(a.actor_email) : undefined,
    note: a.note ? String(a.note) : undefined,
    createdAt: String(a.created_at),
  }));
  return mapPostRow(data, logs);
}

export async function sbCreatePost(post: ContentPost): Promise<ContentPost> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  let batchId = post.batchId;
  let weekLabel = post.weekLabel;
  if (!batchId) {
    const batches = await sbListBatches();
    const active = batches.find((b) => b.status === 'ativo') ?? batches[0];
    if (active) {
      batchId = active.id;
      weekLabel = weekLabel || active.weekLabel;
    } else {
      const startDate = post.recommendedDate || new Date().toISOString().slice(0, 10);
      const endDate = addDaysIso(startDate, 6);
      const newBatchId = `batch-${startDate}-${Date.now()}`;
      const newLabel = `Semana de ${formatPtDateShort(startDate)} a ${formatPtDateShort(endDate)}`;
      const { error: bErr } = await db.from('weekly_batches').insert({
        id: newBatchId,
        brand_profile_id: 'brand-jessica-nalin',
        week_label: newLabel,
        week_start_date: startDate,
        week_end_date: endDate,
        status: 'ativo',
        created_by: 'Jessica Nalin',
      });
      throwIfError(bErr, 'create initial weekly_batch for post');
      batchId = newBatchId;
      weekLabel = newLabel;
    }
  }
  const safePost: ContentPost = {
    ...post,
    batchId,
    weekLabel: weekLabel || 'Semana atual',
    status: 'aguardando_aprovacao',
    publishingState: 'bloqueado_sem_integracao',
    dayOfWeek: post.dayOfWeek || getWeekdayNameFromDate(post.recommendedDate),
  };
  const { error } = await db.from('content_posts').insert(postToRow(safePost));
  if (error) throw new Error(error.message);
  return safePost;
}

export async function sbSaveUpdatedPost(
  updated: ContentPost,
  auditEntry?: ApprovalAuditEntry
): Promise<ContentPost> {
  const db = requireClient();
  const row = postToRow(updated);
  delete row.id;
  const { error } = await db.from('content_posts').update(row).eq('id', updated.id);
  if (error) throw new Error(error.message);

  if (auditEntry) {
    const auditRes = await db.from('approval_audit_logs').insert({
      id: auditEntry.id,
      post_id: updated.id,
      post_id_snapshot: updated.id,
      post_title_snapshot: updated.title,
      action: auditEntry.action,
      actor: auditEntry.actor,
      actor_email: auditEntry.actorEmail ?? null,
      note: auditEntry.note ?? null,
      created_at: auditEntry.createdAt,
    });
    throwIfError(auditRes.error, 'insert approval_audit_logs');
  }
  return (await sbGetPostById(updated.id)) ?? updated;
}

export async function sbDeletePost(
  id: string,
  actor?: { name: string; email?: string }
): Promise<boolean> {
  const db = requireClient();
  const existing = await sbGetPostById(id);
  if (!existing) return false;

  const now = new Date().toISOString();
  const deleteAuditId = `aud-del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Registra a exclusão ANTES de remover o post; o FK ON DELETE SET NULL preserva este registro
  // e todos os registros anteriores (aprovação, rejeição, alterações) permanentemente.
  const auditRes = await db.from('approval_audit_logs').insert({
    id: deleteAuditId,
    post_id: existing.id,
    post_id_snapshot: existing.id,
    post_title_snapshot: existing.title,
    action: 'EXCLUIR',
    actor: actor?.name || 'Jessica Nalin',
    actor_email: actor?.email ?? null,
    note: `Publicação excluída: "${existing.title}" (lote ${existing.batchId}).`,
    created_at: now,
  });
  throwIfError(auditRes.error, 'insert delete approval_audit_logs');

  const { data, error } = await db.from('content_posts').delete().eq('id', id).select('id');
  throwIfError(error, 'delete content_posts');
  return Boolean(data && data.length > 0);
}

export async function sbFindMediaAssetByStoragePath(
  storagePath: string
): Promise<MediaAsset | null> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { data, error } = await db
    .from('media_assets')
    .select('*')
    .eq('storage_path', storagePath)
    .maybeSingle();
  throwIfError(error, 'find media_assets by storage_path');
  if (!data) return null;

  return {
    id: String(data.id),
    name: String(data.name),
    category: data.category as MediaAsset['category'],
    authenticity: data.authenticity as MediaAsset['authenticity'],
    url: String(data.url),
    storagePath: data.storage_path ? String(data.storage_path) : undefined,
    storageProvider: (data.storage_provider as MediaAsset['storageProvider']) || 'supabase_storage',
    mimeType: String(data.mime_type),
    fileSizeBytes: data.file_size_bytes ? Number(data.file_size_bytes) : undefined,
    notes: data.notes ? String(data.notes) : undefined,
    linkedBatchIds: [],
    linkedPostIds: [],
    createdAt: String(data.created_at),
  };
}

export async function sbVerifyStorageObjectExists(storagePath: string): Promise<boolean> {
  const db = requireClient();
  const bucket = getSupabaseServerConfig().storageBucket;
  const slashIdx = storagePath.lastIndexOf('/');
  if (slashIdx <= 0 || slashIdx >= storagePath.length - 1) return false;

  const folder = storagePath.slice(0, slashIdx);
  const filename = storagePath.slice(slashIdx + 1);
  const { data, error } = await db.storage.from(bucket).list(folder, {
    limit: 100,
    search: filename,
  });
  if (error || !Array.isArray(data)) return false;
  return data.some((obj) => obj.name === filename);
}

export async function sbListMediaAssets(): Promise<MediaAsset[]> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const [{ data: assets, error: assetsErr }, { data: links, error: linksErr }] = await Promise.all([
    db.from('media_assets').select('*').order('created_at', { ascending: false }),
    db.from('media_associations').select('*'),
  ]);
  throwIfError(assetsErr, 'list media_assets');
  throwIfError(linksErr, 'list media_associations');

  const batchLinks = new Map<string, Set<string>>();
  const postLinks = new Map<string, Set<string>>();
  for (const l of links ?? []) {
    const mid = String(l.media_asset_id);
    if (l.batch_id) {
      if (!batchLinks.has(mid)) batchLinks.set(mid, new Set());
      batchLinks.get(mid)!.add(String(l.batch_id));
    }
    if (l.post_id) {
      if (!postLinks.has(mid)) postLinks.set(mid, new Set());
      postLinks.get(mid)!.add(String(l.post_id));
    }
  }

  return (assets ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    category: row.category as MediaAsset['category'],
    authenticity: row.authenticity as MediaAsset['authenticity'],
    url: String(row.url),
    storagePath: row.storage_path ? String(row.storage_path) : undefined,
    storageProvider: (row.storage_provider as MediaAsset['storageProvider']) || 'supabase_storage',
    mimeType: String(row.mime_type),
    fileSizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    linkedBatchIds: Array.from(batchLinks.get(String(row.id)) ?? []),
    linkedPostIds: Array.from(postLinks.get(String(row.id)) ?? []),
    createdAt: String(row.created_at),
  }));
}

export async function sbAddMediaAsset(asset: MediaAsset): Promise<MediaAsset> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { error } = await db.from('media_assets').insert({
    id: asset.id,
    brand_profile_id: 'brand-jessica-nalin',
    name: asset.name,
    category: asset.category,
    authenticity: asset.authenticity,
    url: asset.url,
    storage_path: asset.storagePath ?? null,
    storage_provider: asset.storageProvider,
    mime_type: asset.mimeType,
    file_size_bytes: asset.fileSizeBytes ?? null,
    notes: asset.notes ?? null,
  });
  throwIfError(error, 'insert media_assets');

  for (const batchId of asset.linkedBatchIds) {
    const r = await db
      .from('media_associations')
      .insert({ media_asset_id: asset.id, batch_id: batchId });
    if (r.error && r.error.code !== '23505') {
      throwIfError(r.error, 'insert media_associations batch');
    }
  }
  for (const postId of asset.linkedPostIds) {
    const r = await db
      .from('media_associations')
      .insert({ media_asset_id: asset.id, post_id: postId });
    if (r.error && r.error.code !== '23505') {
      throwIfError(r.error, 'insert media_associations post');
    }
  }
  return asset;
}

export async function sbLinkMedia(input: {
  mediaAssetId: string;
  batchId?: string;
  postId?: string;
}): Promise<{ ok: true } | { ok: false; status: 404; error: string }> {
  const db = requireClient();

  const { data: mediaRow } = await db
    .from('media_assets')
    .select('id')
    .eq('id', input.mediaAssetId)
    .maybeSingle();
  if (!mediaRow) {
    return { ok: false, status: 404, error: 'Mídia não encontrada.' };
  }

  if (input.batchId) {
    const { data: batchRow } = await db
      .from('weekly_batches')
      .select('id')
      .eq('id', input.batchId)
      .maybeSingle();
    if (!batchRow) {
      return { ok: false, status: 404, error: 'Lote semanal não encontrado.' };
    }
  }

  if (input.postId) {
    const { data: postRow } = await db
      .from('content_posts')
      .select('id')
      .eq('id', input.postId)
      .maybeSingle();
    if (!postRow) {
      return { ok: false, status: 404, error: 'Publicação não encontrada.' };
    }
  }

  const res = await db.from('media_associations').insert({
    media_asset_id: input.mediaAssetId,
    batch_id: input.batchId ?? null,
    post_id: input.postId ?? null,
  });
  if (res.error && res.error.code !== '23505') {
    throwIfError(res.error, 'link media_associations');
  }
  return { ok: true };
}

export async function sbUnlinkMedia(input: {
  mediaAssetId: string;
  batchId?: string;
  postId?: string;
}): Promise<{ ok: true } | { ok: false; status: 404; error: string }> {
  const db = requireClient();

  const { data: mediaRow } = await db
    .from('media_assets')
    .select('id')
    .eq('id', input.mediaAssetId)
    .maybeSingle();
  if (!mediaRow) {
    return { ok: false, status: 404, error: 'Mídia não encontrada.' };
  }

  let q = db.from('media_associations').delete().eq('media_asset_id', input.mediaAssetId);
  if (input.batchId) q = q.eq('batch_id', input.batchId);
  if (input.postId) q = q.eq('post_id', input.postId);
  const { data, error } = await q.select('id');
  throwIfError(error, 'unlink media_associations');
  if (!data || data.length === 0) {
    return { ok: false, status: 404, error: 'Associação não encontrada para remover.' };
  }
  return { ok: true };
}

export async function sbDeleteMediaAsset(id: string): Promise<boolean> {
  const db = requireClient();
  const { data: asset } = await db
    .from('media_assets')
    .select('storage_path, storage_provider')
    .eq('id', id)
    .maybeSingle();

  if (!asset) return false;

  if (asset.storage_provider === 'supabase_storage' && asset.storage_path) {
    const bucket = getSupabaseServerConfig().storageBucket;
    await db.storage.from(bucket).remove([String(asset.storage_path)]);
  }

  const { data, error } = await db.from('media_assets').delete().eq('id', id).select('id');
  return Boolean(!error && data && data.length > 0);
}

export async function sbCreateSignedUploadUrl(storagePath: string): Promise<{
  signedUrl: string;
  token: string;
  assetUrl: string;
  storagePath: string;
}> {
  const db = requireClient();
  const bucket = getSupabaseServerConfig().storageBucket;
  const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(storagePath);
  if (error || !data) {
    throw new Error(error?.message || 'Não foi possível gerar URL assinada no Supabase Storage.');
  }
  return {
    signedUrl: data.signedUrl,
    token: data.token,
    assetUrl: `/api/media/file?path=${encodeURIComponent(storagePath)}`,
    storagePath,
  };
}

export async function sbCreateSignedDownloadUrl(
  storagePath: string,
  expiresInSeconds = 300
): Promise<string> {
  const db = requireClient();
  const bucket = getSupabaseServerConfig().storageBucket;
  const ttl = Math.min(900, Math.max(60, expiresInSeconds));
  const { data, error } = await db.storage.from(bucket).createSignedUrl(storagePath, ttl);
  if (error || !data?.signedUrl) {
    throw new Error(
      error?.message || 'Não foi possível gerar URL temporária assinada para esta mídia.'
    );
  }
  return data.signedUrl;
}

export async function sbListLeads(): Promise<PotentialCustomerLead[]> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { data, error } = await db
    .from('potential_customer_leads')
    .select('*')
    .order('recorded_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: String(r.id),
    contactName: String(r.contact_name),
    instagramHandle: r.instagram_handle ? String(r.instagram_handle) : undefined,
    interestType: r.interest_type as LeadInterestType,
    sourcePostId: r.source_post_id ? String(r.source_post_id) : undefined,
    sourcePostTitle: r.source_post_title ? String(r.source_post_title) : undefined,
    channel: r.channel as PotentialCustomerLead['channel'],
    stage: r.stage as LeadStage,
    notes: r.notes ? String(r.notes) : undefined,
    recordedAt: String(r.recorded_at),
  }));
}

export async function sbCreateLead(lead: PotentialCustomerLead): Promise<PotentialCustomerLead> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const { error } = await db.from('potential_customer_leads').insert({
    id: lead.id,
    brand_profile_id: 'brand-jessica-nalin',
    contact_name: lead.contactName,
    instagram_handle: lead.instagramHandle ?? null,
    interest_type: lead.interestType,
    source_post_id: lead.sourcePostId ?? null,
    source_post_title: lead.sourcePostTitle ?? null,
    channel: lead.channel,
    stage: lead.stage,
    notes: lead.notes ?? null,
    recorded_at: lead.recordedAt,
  });
  if (error) throw new Error(error.message);
  return lead;
}

export async function sbUpdateLeadStage(
  id: string,
  stage: LeadStage,
  notes?: string
): Promise<PotentialCustomerLead | null> {
  const db = requireClient();
  const { data, error } = await db
    .from('potential_customer_leads')
    .update({ stage, ...(notes !== undefined ? { notes: notes.trim() || null } : {}) })
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: String(data.id),
    contactName: String(data.contact_name),
    instagramHandle: data.instagram_handle ? String(data.instagram_handle) : undefined,
    interestType: data.interest_type as LeadInterestType,
    sourcePostId: data.source_post_id ? String(data.source_post_id) : undefined,
    sourcePostTitle: data.source_post_title ? String(data.source_post_title) : undefined,
    channel: data.channel as PotentialCustomerLead['channel'],
    stage: data.stage as LeadStage,
    notes: data.notes ? String(data.notes) : undefined,
    recordedAt: String(data.recorded_at),
  };
}

export async function sbDeleteLead(id: string): Promise<boolean> {
  const db = requireClient();
  const { data, error } = await db
    .from('potential_customer_leads')
    .delete()
    .eq('id', id)
    .select('id');
  return Boolean(!error && data && data.length > 0);
}

export async function sbGetAutomationSettings(): Promise<AutomationSettings> {
  await ensureSupabaseSeeded();
  const db = requireClient();
  const seed = createDemoSeedData().automationSettings;
  const { data } = await db
    .from('automation_settings')
    .select('*')
    .eq('id', 'automation-default')
    .maybeSingle();
  if (!data) return seed;
  return {
    id: String(data.id),
    enabled: Boolean(data.enabled),
    reviewDay: (data.review_day as AutomationSettings['reviewDay']) || 'sabado',
    preparationDay: (data.preparation_day as 'quinta' | 'sexta') || 'sexta',
    preparationTime: String(data.preparation_time || '18:00'),
    readyTime: String(data.ready_time || '08:00'),
    postsPerWeek: Number(data.posts_per_week || 7),
    notificationChannel: (data.notification_channel as AutomationSettings['notificationChannel']) || 'whatsapp',
    notificationRecipient: String(data.notification_recipient || ''),
    requireExplicitHumanApproval: true,
    autoPublishEnabled: false,
    categoryMix: { ...seed.categoryMix, ...((data.category_mix as Record<string, number>) || {}) },
    objectiveMix: { ...seed.objectiveMix, ...((data.objective_mix as Record<string, number>) || {}) },
    lastPreparedAt: String(data.last_prepared_at || seed.lastPreparedAt),
    nextPreparationAt: String(data.next_preparation_at || seed.nextPreparationAt),
    updatedAt: String(data.updated_at || seed.updatedAt),
  };
}

export async function sbUpdateAutomationSettings(
  partial: Partial<AutomationSettings>
): Promise<AutomationSettings> {
  const current = await sbGetAutomationSettings();
  const next: AutomationSettings = {
    ...current,
    ...partial,
    requireExplicitHumanApproval: true,
    autoPublishEnabled: false,
    categoryMix: { ...current.categoryMix, ...(partial.categoryMix ?? {}) },
    objectiveMix: { ...current.objectiveMix, ...(partial.objectiveMix ?? {}) },
  };
  const db = requireClient();
  const autoRes = await db.from('automation_settings').upsert(
    {
      id: 'automation-default',
      brand_profile_id: 'brand-jessica-nalin',
      enabled: next.enabled,
      review_day: 'sabado',
      preparation_day: next.preparationDay,
      preparation_time: next.preparationTime,
      ready_time: next.readyTime,
      posts_per_week: next.postsPerWeek,
      notification_channel: next.notificationChannel,
      notification_recipient: next.notificationRecipient,
      require_explicit_human_approval: true,
      auto_publish_enabled: false,
      category_mix: next.categoryMix,
      objective_mix: next.objectiveMix,
    },
    { onConflict: 'id' }
  );
  throwIfError(autoRes.error, 'update automation_settings');
  return sbGetAutomationSettings();
}
