import { promises as fs } from 'fs';
import path from 'path';
import type {
  AnalyticsReport,
  ApprovalAuditEntry,
  ApprovalStatus,
  AutomationSettings,
  BrandProfile,
  ContentPost,
  ContentToneProfile,
  DashboardMetrics,
  IntegrationStatus,
  KnowledgeDocumentRef,
  LeadInterestType,
  LeadStage,
  MarketingDatabase,
  MediaAsset,
  PotentialCustomerLead,
  ReelsProductionWorkflow,
  WeeklyBatch,
} from '@/types/marketing';
import { createDemoSeedData, OFFICIAL_KNOWLEDGE_DOCUMENTS } from '@/lib/data/demo-seed';
import { getSupabaseServerConfig } from '@/lib/supabase/client';
import { getGeminiMarketingService, getGeminiServerConfig } from '@/lib/integrations/gemini';
import { getMetricoolServerConfig } from '@/lib/integrations/metricool';
import { getAuthProviderMode } from '@/lib/auth/session';
import {
  addDaysIso,
  formatPtDateShort,
  getNextMondayIso,
  getWeekdayNameFromDate,
} from '@/lib/constants/labels';
import {
  isSupabaseDemoSeedAllowed,
  sbAddMediaAsset,
  sbCreateBatchWithPosts,
  sbCreateLead,
  sbCreatePost,
  sbDeleteLead,
  sbDeleteMediaAsset,
  sbDeletePost,
  sbFindMediaAssetByStoragePath,
  sbGetAutomationSettings,
  sbGetBrandProfile,
  sbGetPostById,
  sbLinkMedia,
  sbListBatches,
  sbListKnowledgeDocuments,
  sbListLeads,
  sbListMediaAssets,
  sbListPosts,
  sbSaveUpdatedPost,
  sbUnlinkMedia,
  sbUpdateAutomationSettings,
  sbUpdateBrandProfile,
  sbUpdateLeadStage,
  sbVerifyStorageObjectExists,
} from '@/lib/store/supabase-repository';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'jessica-marketing-db.json');

let initPromise: Promise<MarketingDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function useSupabase(): boolean {
  return getSupabaseServerConfig().configured;
}

function hydrateDatabase(rawDb: Partial<MarketingDatabase>): MarketingDatabase {
  const seed = createDemoSeedData();

  const brandProfile: BrandProfile = {
    ...seed.brandProfile,
    ...(rawDb.brandProfile ?? {}),
    positioningPillars:
      Array.isArray(rawDb.brandProfile?.positioningPillars) &&
      rawDb.brandProfile.positioningPillars.length > 0
        ? rawDb.brandProfile.positioningPillars
        : seed.brandProfile.positioningPillars,
    verifiedCommercialInfo: {
      ...seed.brandProfile.verifiedCommercialInfo,
      ...(rawDb.brandProfile?.verifiedCommercialInfo ?? {}),
    },
    visualIdentity: {
      ...seed.brandProfile.visualIdentity,
      ...(rawDb.brandProfile?.visualIdentity ?? {}),
    },
  };

  const batches: WeeklyBatch[] =
    Array.isArray(rawDb.batches) && rawDb.batches.length > 0
      ? rawDb.batches
      : seed.batches;
  const fallbackBatchId = (batches.find((b) => b.status === 'ativo') ?? batches[0]).id;

  const posts: ContentPost[] = Array.isArray(rawDb.posts)
    ? rawDb.posts.map((p) => ({
        ...p,
        batchId: p.batchId || fallbackBatchId,
        strategicObjective:
          p.strategicObjective ??
          (p.category === 'comercial' || p.category === 'engajamento'
            ? 'captacao_clientes'
            : p.category === 'autoridade'
              ? 'autoridade_profissional'
              : 'crescimento_audiencia'),
        toneProfile: p.toneProfile ?? 'acolhedor_sereno',
        definedAudience: p.definedAudience ?? brandProfile.targetAudience,
        openingHook: p.openingHook ?? p.title,
        educationalValue: p.educationalValue ?? p.marketingObjective,
      }))
    : seed.posts;

  const mediaLibrary: MediaAsset[] =
    Array.isArray(rawDb.mediaLibrary) && rawDb.mediaLibrary.length > 0
      ? rawDb.mediaLibrary.map((m) => ({
          ...m,
          storageProvider: m.storageProvider ?? 'local',
          linkedBatchIds: Array.isArray(m.linkedBatchIds) ? m.linkedBatchIds : [],
          linkedPostIds: Array.isArray(m.linkedPostIds) ? m.linkedPostIds : [],
        }))
      : seed.mediaLibrary;

  const leads: PotentialCustomerLead[] = Array.isArray(rawDb.leads) ? rawDb.leads : [];
  const knowledgeDocuments: KnowledgeDocumentRef[] =
    Array.isArray(rawDb.knowledgeDocuments) && rawDb.knowledgeDocuments.length > 0
      ? rawDb.knowledgeDocuments
      : OFFICIAL_KNOWLEDGE_DOCUMENTS;

  const automationSettings: AutomationSettings = {
    ...seed.automationSettings,
    ...(rawDb.automationSettings ?? {}),
    requireExplicitHumanApproval: true,
    autoPublishEnabled: false,
    categoryMix: {
      ...seed.automationSettings.categoryMix,
      ...(rawDb.automationSettings?.categoryMix ?? {}),
    },
    objectiveMix: {
      ...seed.automationSettings.objectiveMix,
      ...(rawDb.automationSettings?.objectiveMix ?? {}),
    },
  };

  return {
    brandProfile,
    batches,
    posts,
    mediaLibrary,
    leads,
    knowledgeDocuments,
    automationSettings,
    analyticsDemo: {
      ...seed.analyticsDemo,
      ...(rawDb.analyticsDemo ?? {}),
    },
  };
}

async function ensureLocalDatabase(): Promise<MarketingDatabase> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<MarketingDatabase>;
    if (!parsed || !parsed.brandProfile || !Array.isArray(parsed.posts)) {
      throw new Error('Estrutura local inválida');
    }
    return hydrateDatabase(parsed);
  } catch {
    if (!initPromise) {
      initPromise = (async () => {
        const seed = createDemoSeedData();
        await saveLocalDatabase(seed);
        return seed;
      })().finally(() => {
        initPromise = null;
      });
    }
    return initPromise;
  }
}

async function saveLocalDatabase(db: MarketingDatabase): Promise<void> {
  const payload = JSON.stringify(db, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const unique = `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    const tempFile = `${DB_FILE}.${unique}.tmp`;
    await fs.writeFile(tempFile, payload, 'utf-8');
    await fs.rename(tempFile, DB_FILE);
  });
  return writeQueue;
}

export async function getIntegrationStatus(): Promise<IntegrationStatus> {
  const supabase = getSupabaseServerConfig();
  const gemini = getGeminiServerConfig();
  const metricool = getMetricoolServerConfig();
  const authMode = getAuthProviderMode();
  const knowledgeDocuments = useSupabase()
    ? await sbListKnowledgeDocuments()
    : (await ensureLocalDatabase()).knowledgeDocuments;

  return {
    mode: 'demo',
    persistenceBackend: supabase.configured ? 'supabase' : 'local_json',
    authMode,
    publishingProvider: 'metricool',
    publishingAllowed: false,
    instagramPublishingAllowed: false,
    knowledgeDocuments,
    services: {
      supabase: {
        configured: supabase.configured,
        statusLabel: supabase.configured
          ? 'Conectado (Supabase Free / Server-Side)'
          : 'Fallback Local (.data) — Pronto para Supabase Free',
        detail: supabase.configured
          ? `PostgreSQL + Storage (${supabase.storageBucket}) ativos no servidor com RLS.`
          : 'Configure as chaves do projeto Supabase de desenvolvimento no servidor para ativar banco e Storage na nuvem.',
      },
      gemini: {
        configured: gemini.configured,
        statusLabel: gemini.configured
          ? `Chave pronta (${gemini.model} — P2)`
          : 'Motor Editorial Local (Sem Custo — P2)',
        detail:
          'Na P2 será conectado aos 3 documentos oficiais registrados (Mapa de Conhecimento v1.1, Auditoria v1.1 e DNA Editorial v1.3).',
      },
      metricool: {
        configured: metricool.configured,
        statusLabel: 'Preparado para P4 (Publicação Desativada na P1)',
        detail: `Solução escolhida para publicação e métricas futuras de ${metricool.targetHandle} (${metricool.targetProfileUrl}). Sem publicação automática nesta fase.`,
      },
      instagram: {
        configured: false,
        statusLabel: 'Via Metricool (Sem API direta da Meta na P1)',
        detail: `Perfil oficial vinculado: ${metricool.targetHandle} (${metricool.targetProfileUrl}). Publicação e métricas futuras serão integradas via Metricool.`,
      },
    },
  };
}

export async function getBrandProfile(): Promise<BrandProfile> {
  if (useSupabase()) return sbGetBrandProfile();
  return (await ensureLocalDatabase()).brandProfile;
}

export async function updateBrandProfile(partial: Partial<BrandProfile>): Promise<BrandProfile> {
  if (useSupabase()) return sbUpdateBrandProfile(partial);
  const db = await ensureLocalDatabase();
  const updated: BrandProfile = {
    ...db.brandProfile,
    ...partial,
    id: db.brandProfile.id,
    verifiedCommercialInfo: {
      ...db.brandProfile.verifiedCommercialInfo,
      ...(partial.verifiedCommercialInfo ?? {}),
    },
    visualIdentity: {
      ...db.brandProfile.visualIdentity,
      ...(partial.visualIdentity ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
  db.brandProfile = updated;
  await saveLocalDatabase(db);
  return updated;
}

export async function resetBrandProfileToDefault(): Promise<BrandProfile> {
  const seed = createDemoSeedData().brandProfile;
  return updateBrandProfile(seed);
}

// ============================================================================
// Lotes Semanais Versionados (Histórico Persistente — Nunca sobrescreve!)
// ============================================================================

export async function listWeeklyBatches(): Promise<WeeklyBatch[]> {
  if (useSupabase()) return sbListBatches();
  const db = await ensureLocalDatabase();
  return [...db.batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getActiveBatch(): Promise<WeeklyBatch | null> {
  const batches = await listWeeklyBatches();
  return batches.find((b) => b.status === 'ativo') ?? batches[0] ?? null;
}

export async function ensureActiveBatch(createdBy = 'Jessica Nalin'): Promise<WeeklyBatch> {
  const existing = await getActiveBatch();
  if (existing) return existing;

  const weekStartDate = getNextMondayIso();
  const { batch } = await createNewWeeklyBatchWithPosts({
    weekStartDate,
    createdBy,
    posts: [],
  });
  return batch;
}

export async function createNewWeeklyBatchWithPosts(input: {
  weekStartDate: string;
  focusTheme?: string;
  createdBy: string;
  posts: ContentPost[];
}): Promise<{ batch: WeeklyBatch; posts: ContentPost[] }> {
  if (useSupabase()) return sbCreateBatchWithPosts(input);

  const db = await ensureLocalDatabase();
  const now = new Date().toISOString();
  const weekEndDate = addDaysIso(input.weekStartDate, 6);
  const weekLabel = `Semana de ${formatPtDateShort(input.weekStartDate)} a ${formatPtDateShort(weekEndDate)}`;
  const batchId = input.posts[0]?.batchId || `batch-${input.weekStartDate}-${Date.now()}`;

  // Arquiva lotes anteriores preservando 100% do histórico e vínculos com leads!
  db.batches = db.batches.map((b) =>
    b.status === 'ativo' ? { ...b, status: 'arquivado', updatedAt: now } : b
  );

  const newBatch: WeeklyBatch = {
    id: batchId,
    weekLabel,
    weekStartDate: input.weekStartDate,
    weekEndDate,
    focusTheme: input.focusTheme?.trim() || undefined,
    status: 'ativo',
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  db.batches.unshift(newBatch);

  const preparedPosts = input.posts.map((p) => ({
    ...p,
    batchId,
    weekLabel,
    status: 'aguardando_aprovacao' as ApprovalStatus,
    publishingState: 'bloqueado_sem_integracao' as const,
  }));

  db.posts.push(...preparedPosts);
  db.automationSettings.lastPreparedAt = now;
  await saveLocalDatabase(db);

  return { batch: newBatch, posts: preparedPosts };
}

export async function listPosts(filters?: {
  batchId?: string;
  status?: ApprovalStatus | 'todos';
  category?: string;
  format?: string;
  includeAllBatches?: boolean;
}): Promise<ContentPost[]> {
  if (useSupabase()) return sbListPosts(filters);

  const db = await ensureLocalDatabase();
  let targetBatchId = filters?.batchId;
  if (!targetBatchId && !filters?.includeAllBatches) {
    const active = db.batches.find((b) => b.status === 'ativo') ?? db.batches[0];
    targetBatchId = active?.id;
  }

  let items = [...db.posts];
  if (targetBatchId && targetBatchId !== 'todos') {
    items = items.filter((p) => p.batchId === targetBatchId);
  }
  if (filters?.status && filters.status !== 'todos') {
    items = items.filter((p) => p.status === filters.status);
  }
  if (filters?.category && filters.category !== 'todos') {
    items = items.filter((p) => p.category === filters.category);
  }
  if (filters?.format && filters.format !== 'todos') {
    items = items.filter((p) => p.format === filters.format);
  }

  return items.sort((a, b) => {
    const dateCompare = a.recommendedDate.localeCompare(b.recommendedDate);
    if (dateCompare !== 0) return dateCompare;
    return a.recommendedTime.localeCompare(b.recommendedTime);
  });
}

export async function getPostById(id: string): Promise<ContentPost | null> {
  if (useSupabase()) return sbGetPostById(id);
  const db = await ensureLocalDatabase();
  return db.posts.find((p) => p.id === id) ?? null;
}

export async function createPost(post: ContentPost): Promise<ContentPost> {
  if (useSupabase()) return sbCreatePost(post);
  const db = await ensureLocalDatabase();
  const active = db.batches.find((b) => b.status === 'ativo') ?? db.batches[0];
  const safePost: ContentPost = {
    ...post,
    batchId: post.batchId || active.id,
    weekLabel: post.weekLabel || active.weekLabel,
    status: 'aguardando_aprovacao',
    publishingState: 'bloqueado_sem_integracao',
    dayOfWeek: post.dayOfWeek || getWeekdayNameFromDate(post.recommendedDate),
    updatedAt: new Date().toISOString(),
  };
  db.posts.push(safePost);
  await saveLocalDatabase(db);
  return safePost;
}

export async function updatePost(
  id: string,
  updates: Partial<ContentPost>,
  auditMeta?: { note?: string; actor?: string; actorEmail?: string }
): Promise<ContentPost | null> {
  const existing = await getPostById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const nextDate = updates.recommendedDate ?? existing.recommendedDate;

  const auditEntry: ApprovalAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: updates.recommendedDate || updates.recommendedTime ? 'REAGENDAR' : 'EDITAR',
    actor: auditMeta?.actor || 'Jessica Nalin',
    actorEmail: auditMeta?.actorEmail,
    note: auditMeta?.note || 'Conteúdo atualizado na plataforma.',
    createdAt: now,
  };

  const updated: ContentPost = {
    ...existing,
    ...updates,
    id: existing.id,
    batchId: existing.batchId,
    dayOfWeek: getWeekdayNameFromDate(nextDate),
    publishingState: 'bloqueado_sem_integracao',
    auditLog: [auditEntry, ...(existing.auditLog ?? [])],
    updatedAt: now,
  };

  if (useSupabase()) return sbSaveUpdatedPost(updated, auditEntry);

  const db = await ensureLocalDatabase();
  const idx = db.posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.posts[idx] = updated;
  await saveLocalDatabase(db);
  return updated;
}

export async function regeneratePostById(input: {
  id: string;
  mode: 'completo' | 'outro_tom' | 'outro_visual';
  requestedTone?: ContentToneProfile;
  visualInstruction?: string;
  actor?: string;
  actorEmail?: string;
}): Promise<ContentPost | null> {
  const existing = await getPostById(input.id);
  if (!existing) return null;

  const [brand, mediaLibrary, allPosts] = await Promise.all([
    getBrandProfile(),
    listMediaAssets(),
    listPosts({ includeAllBatches: true }),
  ]);

  const gemini = getGeminiMarketingService();
  const regenerated = await gemini.regeneratePost({
    post: existing,
    brand,
    mode: input.mode,
    requestedTone: input.requestedTone,
    visualInstruction: input.visualInstruction,
    mediaLibrary,
    existingTitles: allPosts.filter((p) => p.id !== input.id).map((p) => p.title),
  });

  const actionMap: Record<typeof input.mode, ApprovalAuditEntry['action']> = {
    completo: 'REGENERAR',
    outro_tom: 'ALTERAR_TOM',
    outro_visual: 'ALTERAR_VISUAL',
  };

  const auditEntry: ApprovalAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: actionMap[input.mode],
    actor: input.actor || 'Jessica Nalin',
    actorEmail: input.actorEmail,
    note:
      input.mode === 'outro_tom'
        ? `Tom ajustado para ${regenerated.toneProfile}.`
        : input.mode === 'outro_visual'
          ? input.visualInstruction?.trim() ||
            'Nova proposta visual aplicada mantendo a identidade da marca.'
          : 'Conteúdo individual regenerado com nova abordagem editorial.',
    createdAt: new Date().toISOString(),
  };

  const finalPost: ContentPost = {
    ...regenerated,
    batchId: existing.batchId,
    publishingState: 'bloqueado_sem_integracao',
    auditLog: [auditEntry, ...(existing.auditLog ?? [])],
  };

  if (useSupabase()) return sbSaveUpdatedPost(finalPost, auditEntry);

  const db = await ensureLocalDatabase();
  const idx = db.posts.findIndex((p) => p.id === input.id);
  if (idx === -1) return null;
  db.posts[idx] = finalPost;
  await saveLocalDatabase(db);
  return finalPost;
}

export async function updateReelsProductionById(
  postId: string,
  workflowPatch: Partial<ReelsProductionWorkflow>,
  sendToApproval = false,
  actor?: { name: string; email?: string }
): Promise<ContentPost | null> {
  const existing = await getPostById(postId);
  if (!existing) return null;

  const gemini = getGeminiMarketingService();
  const baseProd =
    existing.reelsProduction ?? gemini.buildReelsProductionFromScript(existing);
  const now = new Date().toISOString();

  const nextProduction: ReelsProductionWorkflow = {
    ...baseProd,
    ...workflowPatch,
    stage: sendToApproval
      ? 'pronto_para_aprovacao'
      : workflowPatch.stage ?? baseProd.stage,
    updatedAt: now,
  };

  const auditEntry: ApprovalAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: 'EDITAR',
    actor: actor?.name || 'Jessica Nalin',
    actorEmail: actor?.email,
    note: sendToApproval
      ? 'Vídeo do Reel finalizado e enviado para aprovação humana.'
      : 'Produção do Reel atualizada.',
    createdAt: now,
  };

  const updated: ContentPost = {
    ...existing,
    reelsProduction: nextProduction,
    status: sendToApproval ? 'aguardando_aprovacao' : existing.status,
    publishingState: 'bloqueado_sem_integracao',
    auditLog: [auditEntry, ...(existing.auditLog ?? [])],
    updatedAt: now,
  };

  if (useSupabase()) return sbSaveUpdatedPost(updated, auditEntry);

  const db = await ensureLocalDatabase();
  const idx = db.posts.findIndex((p) => p.id === postId);
  if (idx === -1) return null;
  db.posts[idx] = updated;
  await saveLocalDatabase(db);
  return updated;
}

export async function deletePost(
  id: string,
  actor?: { name: string; email?: string }
): Promise<boolean> {
  if (useSupabase()) return sbDeletePost(id, actor);
  const db = await ensureLocalDatabase();
  const target = db.posts.find((p) => p.id === id);
  if (!target) return false;

  const now = new Date().toISOString();
  const deleteEntry: ApprovalAuditEntry = {
    id: `aud-del-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    postIdSnapshot: target.id,
    postTitleSnapshot: target.title,
    action: 'EXCLUIR',
    actor: actor?.name || 'Jessica Nalin',
    actorEmail: actor?.email,
    note: `Publicação excluída: "${target.title}" (lote ${target.batchId}).`,
    createdAt: now,
  };
  const preservedHistory: ApprovalAuditEntry[] = [
    deleteEntry,
    ...(target.auditLog ?? []).map((entry) => ({
      ...entry,
      postIdSnapshot: entry.postIdSnapshot || target.id,
      postTitleSnapshot: entry.postTitleSnapshot || target.title,
    })),
  ];
  db.archivedAuditLogs = [...preservedHistory, ...(db.archivedAuditLogs ?? [])];
  db.posts = db.posts.filter((p) => p.id !== id);
  await saveLocalDatabase(db);
  return true;
}

export async function applyApprovalDecision(input: {
  postIds: string[];
  action: 'APROVAR' | 'SOLICITAR_ALTERACOES' | 'REJEITAR';
  feedback?: string;
  actor?: string;
  actorEmail?: string;
}): Promise<ContentPost[]> {
  const now = new Date().toISOString();
  const actor = input.actor?.trim() || 'Jessica Nalin';
  const nextStatusMap: Record<typeof input.action, ApprovalStatus> = {
    APROVAR: 'aprovado',
    SOLICITAR_ALTERACOES: 'alteracoes_solicitadas',
    REJEITAR: 'rejeitado',
  };

  if (useSupabase()) {
    const updatedItems: ContentPost[] = [];
    for (const id of input.postIds) {
      const post = await sbGetPostById(id);
      if (!post) continue;
      const nextStatus = nextStatusMap[input.action];
      const auditEntry: ApprovalAuditEntry = {
        id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        postIdSnapshot: post.id,
        postTitleSnapshot: post.title,
        action: input.action,
        actor,
        actorEmail: input.actorEmail,
        note: input.feedback?.trim() || undefined,
        createdAt: now,
      };
      const nextPost: ContentPost = {
        ...post,
        status: nextStatus,
        approvalFeedback:
          input.action === 'APROVAR' ? undefined : input.feedback?.trim() || post.approvalFeedback,
        approvedAt: input.action === 'APROVAR' ? now : undefined,
        approvedBy: input.action === 'APROVAR' ? actor : undefined,
        publishingState: 'bloqueado_sem_integracao',
        auditLog: [auditEntry, ...(post.auditLog ?? [])],
        updatedAt: now,
      };
      updatedItems.push(await sbSaveUpdatedPost(nextPost, auditEntry));
    }
    return updatedItems;
  }

  const db = await ensureLocalDatabase();
  const idSet = new Set(input.postIds);
  const updatedItems: ContentPost[] = [];

  db.posts = db.posts.map((post) => {
    if (!idSet.has(post.id)) return post;
    const nextStatus = nextStatusMap[input.action];
    const auditEntry: ApprovalAuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      postIdSnapshot: post.id,
      postTitleSnapshot: post.title,
      action: input.action,
      actor,
      actorEmail: input.actorEmail,
      note: input.feedback?.trim() || undefined,
      createdAt: now,
    };

    const nextPost: ContentPost = {
      ...post,
      status: nextStatus,
      approvalFeedback:
        input.action === 'APROVAR' ? undefined : input.feedback?.trim() || post.approvalFeedback,
      approvedAt: input.action === 'APROVAR' ? now : undefined,
      approvedBy: input.action === 'APROVAR' ? actor : undefined,
      publishingState: 'bloqueado_sem_integracao',
      auditLog: [auditEntry, ...(post.auditLog ?? [])],
      updatedAt: now,
    };
    updatedItems.push(nextPost);
    return nextPost;
  });

  await saveLocalDatabase(db);
  return updatedItems;
}

export async function approveEntireWeeklyBatch(input: {
  batchId?: string;
  actor?: string;
  actorEmail?: string;
}): Promise<ContentPost[]> {
  const posts = await listPosts({ batchId: input.batchId });
  const eligibleIds = posts
    .filter((p) => p.status !== 'aprovado' && p.status !== 'rejeitado')
    .map((p) => p.id);
  if (eligibleIds.length === 0) return [];
  return applyApprovalDecision({
    postIds: eligibleIds,
    action: 'APROVAR',
    actor: input.actor || 'Jessica Nalin',
    actorEmail: input.actorEmail,
  });
}

// ============================================================================
// Biblioteca de Mídia Autêntica + Associação a Conteúdos e Lotes
// ============================================================================

export async function listMediaAssets(): Promise<MediaAsset[]> {
  if (useSupabase()) return sbListMediaAssets();
  const db = await ensureLocalDatabase();
  return [...db.mediaLibrary].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findMediaAssetByStoragePath(
  storagePath: string
): Promise<MediaAsset | null> {
  if (useSupabase()) return sbFindMediaAssetByStoragePath(storagePath);
  const db = await ensureLocalDatabase();
  return db.mediaLibrary.find((m) => m.storagePath === storagePath) ?? null;
}

export async function verifyStorageObjectExists(storagePath: string): Promise<boolean> {
  if (useSupabase()) return sbVerifyStorageObjectExists(storagePath);
  return false;
}

export async function addMediaAsset(asset: MediaAsset): Promise<MediaAsset> {
  if (useSupabase()) return sbAddMediaAsset(asset);
  const db = await ensureLocalDatabase();
  db.mediaLibrary.unshift(asset);
  await saveLocalDatabase(db);
  return asset;
}

export async function linkMediaToTarget(input: {
  mediaAssetId: string;
  batchId?: string;
  postId?: string;
}): Promise<{ ok: true; asset: MediaAsset } | { ok: false; status: 400 | 404; error: string }> {
  if (useSupabase()) {
    const res = await sbLinkMedia(input);
    if (!res.ok) return res;
    const list = await sbListMediaAssets();
    const asset = list.find((m) => m.id === input.mediaAssetId);
    if (!asset) return { ok: false, status: 404, error: 'Mídia não encontrada.' };
    return { ok: true, asset };
  }
  const db = await ensureLocalDatabase();
  const idx = db.mediaLibrary.findIndex((m) => m.id === input.mediaAssetId);
  if (idx === -1) return { ok: false, status: 404, error: 'Mídia não encontrada.' };
  if (input.batchId && !db.batches.some((b) => b.id === input.batchId)) {
    return { ok: false, status: 404, error: 'Lote semanal não encontrado.' };
  }
  if (input.postId && !db.posts.some((p) => p.id === input.postId)) {
    return { ok: false, status: 404, error: 'Publicação não encontrada.' };
  }

  const asset = db.mediaLibrary[idx];
  const nextBatches = new Set(asset.linkedBatchIds);
  const nextPosts = new Set(asset.linkedPostIds);
  if (input.batchId) nextBatches.add(input.batchId);
  if (input.postId) nextPosts.add(input.postId);

  db.mediaLibrary[idx] = {
    ...asset,
    linkedBatchIds: Array.from(nextBatches),
    linkedPostIds: Array.from(nextPosts),
  };
  await saveLocalDatabase(db);
  return { ok: true, asset: db.mediaLibrary[idx] };
}

export async function unlinkMediaFromTarget(input: {
  mediaAssetId: string;
  batchId?: string;
  postId?: string;
}): Promise<{ ok: true; asset: MediaAsset } | { ok: false; status: 400 | 404; error: string }> {
  if (useSupabase()) {
    const res = await sbUnlinkMedia(input);
    if (!res.ok) return res;
    const list = await sbListMediaAssets();
    const asset = list.find((m) => m.id === input.mediaAssetId);
    if (!asset) return { ok: false, status: 404, error: 'Mídia não encontrada.' };
    return { ok: true, asset };
  }
  const db = await ensureLocalDatabase();
  const idx = db.mediaLibrary.findIndex((m) => m.id === input.mediaAssetId);
  if (idx === -1) return { ok: false, status: 404, error: 'Mídia não encontrada.' };

  const asset = db.mediaLibrary[idx];
  const hadBatch = Boolean(input.batchId && asset.linkedBatchIds.includes(input.batchId));
  const hadPost = Boolean(input.postId && asset.linkedPostIds.includes(input.postId));
  if (!hadBatch && !hadPost) {
    return { ok: false, status: 404, error: 'Associação não encontrada para remover.' };
  }

  db.mediaLibrary[idx] = {
    ...asset,
    linkedBatchIds: input.batchId
      ? asset.linkedBatchIds.filter((id) => id !== input.batchId)
      : asset.linkedBatchIds,
    linkedPostIds: input.postId
      ? asset.linkedPostIds.filter((id) => id !== input.postId)
      : asset.linkedPostIds,
  };
  await saveLocalDatabase(db);
  return { ok: true, asset: db.mediaLibrary[idx] };
}

export async function deleteMediaAsset(id: string): Promise<boolean> {
  if (useSupabase()) return sbDeleteMediaAsset(id);
  const db = await ensureLocalDatabase();
  const target = db.mediaLibrary.find((m) => m.id === id);
  if (!target) return false;
  if (target.storageProvider === 'local' && target.storagePath?.startsWith('uploads/')) {
    const filePath = path.join(DATA_DIR, 'uploads', path.basename(target.storagePath));
    await fs.unlink(filePath).catch(() => {});
  }
  db.mediaLibrary = db.mediaLibrary.filter((m) => m.id !== id);
  await saveLocalDatabase(db);
  return true;
}

// ============================================================================
// Inteligência Comercial — Leads Reais (Preserva referência mesmo em lotes arquivados)
// ============================================================================

export async function listLeads(): Promise<PotentialCustomerLead[]> {
  if (useSupabase()) return sbListLeads();
  const db = await ensureLocalDatabase();
  return [...db.leads].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export async function createLead(input: {
  contactName: string;
  instagramHandle?: string;
  interestType: LeadInterestType;
  sourcePostId?: string;
  channel: PotentialCustomerLead['channel'];
  notes?: string;
}): Promise<PotentialCustomerLead> {
  const sourcePost = input.sourcePostId ? await getPostById(input.sourcePostId) : null;

  const lead: PotentialCustomerLead = {
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    contactName: input.contactName.trim(),
    instagramHandle: input.instagramHandle?.trim()
      ? input.instagramHandle.trim().startsWith('@')
        ? input.instagramHandle.trim()
        : `@${input.instagramHandle.trim()}`
      : undefined,
    interestType: input.interestType,
    sourcePostId: sourcePost?.id,
    sourcePostTitle: sourcePost?.title,
    channel: input.channel,
    stage: 'novo',
    notes: input.notes?.trim() || undefined,
    recordedAt: new Date().toISOString(),
  };

  if (useSupabase()) return sbCreateLead(lead);

  const db = await ensureLocalDatabase();
  db.leads.unshift(lead);
  await saveLocalDatabase(db);
  return lead;
}

export async function updateLeadStage(
  id: string,
  stage: LeadStage,
  notes?: string
): Promise<PotentialCustomerLead | null> {
  if (useSupabase()) return sbUpdateLeadStage(id, stage, notes);
  const db = await ensureLocalDatabase();
  const idx = db.leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  db.leads[idx] = {
    ...db.leads[idx],
    stage,
    ...(notes !== undefined ? { notes: notes.trim() || undefined } : {}),
  };
  await saveLocalDatabase(db);
  return db.leads[idx];
}

export async function deleteLead(id: string): Promise<boolean> {
  if (useSupabase()) return sbDeleteLead(id);
  const db = await ensureLocalDatabase();
  const prev = db.leads.length;
  db.leads = db.leads.filter((l) => l.id !== id);
  if (db.leads.length === prev) return false;
  await saveLocalDatabase(db);
  return true;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const [batches, activePosts, leads, automationSettings] = await Promise.all([
    listWeeklyBatches(),
    listPosts(),
    listLeads(),
    getAutomationSettings(),
  ]);

  const activeBatch = batches.find((b) => b.status === 'ativo') ?? batches[0];
  const awaitingApprovalCount = activePosts.filter(
    (p) => p.status === 'aguardando_aprovacao'
  ).length;
  const approvedCount = activePosts.filter((p) => p.status === 'aprovado').length;
  const changesRequestedCount = activePosts.filter(
    (p) => p.status === 'alteracoes_solicitadas'
  ).length;
  const rejectedCount = activePosts.filter((p) => p.status === 'rejeitado').length;

  const estimatedReviewMinutes = Math.max(2, awaitingApprovalCount * 2);
  const realLeadsCount = leads.length;
  const demoAnalytics = createDemoSeedData().analyticsDemo;

  return {
    dataSource: 'demo',
    periodLabel: 'Últimos 7 dias • Métricas de alcance em demonstração',
    activeBatchId: activeBatch?.id || '',
    activeBatchLabel: activeBatch?.weekLabel || 'Semana atual',
    totalBatchesCount: batches.length,
    totalFollowers: 14820,
    followerGrowthPercent: 4.8,
    followerGrowthCount: 214,
    weeklyReach: demoAnalytics.summary.reach,
    weeklyReachGrowthPercent: 12.4,
    engagementRate: 6.2,
    engagementGrowthPercent: 0.9,
    publishedPostsCount: 28,
    awaitingApprovalCount,
    approvedCount,
    changesRequestedCount,
    rejectedCount,
    potentialCustomersCount: realLeadsCount,
    potentialCustomersSource: realLeadsCount > 0 ? 'real_registrado' : 'sem_registros',
    potentialCustomersGrowthPercent: 0,
    estimatedReviewMinutes,
    nextSaturdayLabel: `Sábado às ${automationSettings.readyTime} (preparado na ${
      automationSettings.preparationDay === 'quinta' ? 'quinta' : 'sexta'
    } às ${automationSettings.preparationTime})`,
    batchReadyBeforeSaturday: activePosts.length >= 7,
  };
}

export async function getAnalyticsReport(): Promise<{
  report: AnalyticsReport;
  leads: PotentialCustomerLead[];
  leadStats: {
    total: number;
    mentoria: number;
    avaliacao_familiar: number;
    informacao: number;
    byPost: Array<{ postId: string; postTitle: string; format: string; count: number }>;
  };
}> {
  const [brand, allPosts, leads] = await Promise.all([
    getBrandProfile(),
    listPosts({ includeAllBatches: true }),
    listLeads(),
  ]);
  const baseDemo = createDemoSeedData().analyticsDemo;

  const postMap = new Map<string, { postId: string; postTitle: string; format: string; count: number }>();
  for (const post of allPosts) {
    postMap.set(post.id, {
      postId: post.id,
      postTitle: `${post.title} (${post.weekLabel})`,
      format: post.format,
      count: 0,
    });
  }

  const formatLeadCounts: Record<string, number> = {
    carrossel: 0,
    reels: 0,
    stories: 0,
    post_unico: 0,
  };

  for (const lead of leads) {
    if (lead.sourcePostId && postMap.has(lead.sourcePostId)) {
      postMap.get(lead.sourcePostId)!.count += 1;
      const src = allPosts.find((p) => p.id === lead.sourcePostId);
      if (src && formatLeadCounts[src.format] !== undefined) {
        formatLeadCounts[src.format] += 1;
      }
    }
  }

  const report: AnalyticsReport = {
    ...baseDemo,
    instagramHandle: brand.instagramHandle || '@eujessynalin',
    instagramUrl: brand.instagramUrl || 'https://www.instagram.com/eujessynalin/',
    summary: {
      ...baseDemo.summary,
      leadsGenerated: leads.length,
    },
    funnel: [
      { stage: 'Alcance semanal (Demo)', value: baseDemo.summary.reach, rateLabel: '100%' },
      { stage: 'Visitas ao perfil (Demo)', value: baseDemo.summary.profileVisits, rateLabel: '7,5% do alcance' },
      { stage: 'Salvamentos qualificados (Demo)', value: baseDemo.summary.saves, rateLabel: '4,9% do alcance' },
      {
        stage: 'Interessados reais registrados',
        value: leads.length,
        rateLabel: leads.length > 0 ? 'Dados reais da equipe' : 'Nenhum registro ainda',
      },
    ],
    formatPerformance: baseDemo.formatPerformance.map((row) => ({
      ...row,
      leads: formatLeadCounts[row.format] ?? 0,
    })),
  };

  return {
    report,
    leads,
    leadStats: {
      total: leads.length,
      mentoria: leads.filter((l) => l.interestType === 'mentoria').length,
      avaliacao_familiar: leads.filter((l) => l.interestType === 'avaliacao_familiar').length,
      informacao: leads.filter((l) => l.interestType === 'informacao').length,
      byPost: Array.from(postMap.values()).sort((a, b) => b.count - a.count),
    },
  };
}

export async function getAutomationSettings(): Promise<AutomationSettings> {
  if (useSupabase()) return sbGetAutomationSettings();
  return (await ensureLocalDatabase()).automationSettings;
}

export async function updateAutomationSettings(
  partial: Partial<AutomationSettings>
): Promise<AutomationSettings> {
  if (useSupabase()) return sbUpdateAutomationSettings(partial);
  const db = await ensureLocalDatabase();
  const updated: AutomationSettings = {
    ...db.automationSettings,
    ...partial,
    id: db.automationSettings.id,
    requireExplicitHumanApproval: true,
    autoPublishEnabled: false,
    categoryMix: {
      ...db.automationSettings.categoryMix,
      ...(partial.categoryMix ?? {}),
    },
    objectiveMix: {
      ...db.automationSettings.objectiveMix,
      ...(partial.objectiveMix ?? {}),
    },
    updatedAt: new Date().toISOString(),
  };
  db.automationSettings = updated;
  await saveLocalDatabase(db);
  return updated;
}

export function isDemoResetAllowed(): boolean {
  if (useSupabase()) {
    return isSupabaseDemoSeedAllowed();
  }
  return process.env['NODE_ENV'] !== 'production';
}

export async function resetDemoData(): Promise<MarketingDatabase> {
  if (!isDemoResetAllowed()) {
    throw new Error(
      'Restauração de dados demonstrativos bloqueada neste ambiente (desativada em produção e por padrão no Supabase).'
    );
  }
  const seed = createDemoSeedData();
  if (!useSupabase()) {
    await saveLocalDatabase(seed);
  }
  return seed;
}
