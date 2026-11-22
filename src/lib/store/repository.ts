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
  LeadInterestType,
  LeadStage,
  MarketingDatabase,
  MediaAsset,
  PotentialCustomerLead,
  ReelsProductionWorkflow,
} from '@/types/marketing';
import { createDemoSeedData } from '@/lib/data/demo-seed';
import { getSupabaseServerConfig } from '@/lib/supabase/client';
import { getGeminiMarketingService, getGeminiServerConfig } from '@/lib/integrations/gemini';
import { getInstagramServerConfig } from '@/lib/integrations/instagram';
import { getWeekdayNameFromDate } from '@/lib/constants/labels';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'jessica-marketing-db.json');

let initPromise: Promise<MarketingDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

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

  const posts: ContentPost[] = Array.isArray(rawDb.posts)
    ? rawDb.posts.map((p) => ({
        ...p,
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
      ? rawDb.mediaLibrary
      : seed.mediaLibrary;

  const leads: PotentialCustomerLead[] = Array.isArray(rawDb.leads) ? rawDb.leads : [];

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
    posts,
    mediaLibrary,
    leads,
    automationSettings,
    analyticsDemo: {
      ...seed.analyticsDemo,
      ...(rawDb.analyticsDemo ?? {}),
    },
  };
}

async function ensureDatabase(): Promise<MarketingDatabase> {
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
        await saveDatabase(seed);
        return seed;
      })().finally(() => {
        initPromise = null;
      });
    }
    return initPromise;
  }
}

async function saveDatabase(db: MarketingDatabase): Promise<void> {
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
  const instagram = getInstagramServerConfig();

  return {
    mode: 'demo',
    instagramPublishingAllowed: false,
    services: {
      supabase: {
        configured: supabase.configured,
        statusLabel: supabase.configured ? 'Configurado (Servidor)' : 'Modo Demonstração Local',
        detail: supabase.configured
          ? 'Credenciais server-side detectadas. Esquema SQL pronto para produção.'
          : 'Persistência local ativa (.data). Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no servidor para migrar.',
      },
      gemini: {
        configured: gemini.configured,
        statusLabel: gemini.configured
          ? `Pronto (${gemini.model})`
          : 'Motor Editorial Local (Sem Custo)',
        detail: gemini.configured
          ? 'Chave detectada no servidor. Aguardando autorização explícita para chamadas externas.'
          : 'Usando inteligência editorial de educação parental em modo local sem consumo de APIs pagas.',
      },
      instagram: {
        configured: instagram.configured,
        statusLabel: 'Publicação Desativada (Etapa 1)',
        detail: `Conta vinculada: ${instagram.handle} (${instagram.profileUrl}). Métricas exibidas são de demonstração e a publicação automática permanece bloqueada até ativação oficial da Meta Graph API.`,
      },
    },
  };
}

export async function getBrandProfile(): Promise<BrandProfile> {
  const db = await ensureDatabase();
  return db.brandProfile;
}

export async function updateBrandProfile(partial: Partial<BrandProfile>): Promise<BrandProfile> {
  const db = await ensureDatabase();
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
  await saveDatabase(db);
  return updated;
}

export async function resetBrandProfileToDefault(): Promise<BrandProfile> {
  const db = await ensureDatabase();
  const seed = createDemoSeedData();
  db.brandProfile = { ...seed.brandProfile, updatedAt: new Date().toISOString() };
  await saveDatabase(db);
  return db.brandProfile;
}

export async function listPosts(filters?: {
  status?: ApprovalStatus | 'todos';
  category?: string;
  format?: string;
}): Promise<ContentPost[]> {
  const db = await ensureDatabase();
  let items = [...db.posts];

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
  const db = await ensureDatabase();
  return db.posts.find((p) => p.id === id) ?? null;
}

export async function createPost(post: ContentPost): Promise<ContentPost> {
  const db = await ensureDatabase();
  const safePost: ContentPost = {
    ...post,
    status: 'aguardando_aprovacao',
    publishingState: 'bloqueado_sem_integracao',
    dayOfWeek: post.dayOfWeek || getWeekdayNameFromDate(post.recommendedDate),
    updatedAt: new Date().toISOString(),
  };
  db.posts.push(safePost);
  await saveDatabase(db);
  return safePost;
}

export async function replaceWeeklyPosts(newPosts: ContentPost[]): Promise<ContentPost[]> {
  const db = await ensureDatabase();
  db.posts = newPosts.map((p) => ({
    ...p,
    status: 'aguardando_aprovacao',
    publishingState: 'bloqueado_sem_integracao',
  }));
  db.automationSettings.lastPreparedAt = new Date().toISOString();
  await saveDatabase(db);
  return listPosts();
}

export async function updatePost(
  id: string,
  updates: Partial<ContentPost>,
  auditNote?: string
): Promise<ContentPost | null> {
  const db = await ensureDatabase();
  const idx = db.posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const existing = db.posts[idx];
  const now = new Date().toISOString();
  const nextDate = updates.recommendedDate ?? existing.recommendedDate;

  const auditEntry: ApprovalAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: updates.recommendedDate || updates.recommendedTime ? 'REAGENDAR' : 'EDITAR',
    actor: 'Jessica Nalin',
    note: auditNote || 'Conteúdo atualizado na plataforma.',
    createdAt: now,
  };

  const updated: ContentPost = {
    ...existing,
    ...updates,
    id: existing.id,
    dayOfWeek: getWeekdayNameFromDate(nextDate),
    publishingState: 'bloqueado_sem_integracao',
    auditLog: [auditEntry, ...(existing.auditLog ?? [])],
    updatedAt: now,
  };

  db.posts[idx] = updated;
  await saveDatabase(db);
  return updated;
}

export async function regeneratePostById(input: {
  id: string;
  mode: 'completo' | 'outro_tom' | 'outro_visual';
  requestedTone?: ContentToneProfile;
  visualInstruction?: string;
}): Promise<ContentPost | null> {
  const db = await ensureDatabase();
  const idx = db.posts.findIndex((p) => p.id === input.id);
  if (idx === -1) return null;

  const existing = db.posts[idx];
  const gemini = getGeminiMarketingService();
  const regenerated = await gemini.regeneratePost({
    post: existing,
    brand: db.brandProfile,
    mode: input.mode,
    requestedTone: input.requestedTone,
    visualInstruction: input.visualInstruction,
    mediaLibrary: db.mediaLibrary,
    existingTitles: db.posts.filter((p) => p.id !== input.id).map((p) => p.title),
  });

  const actionMap: Record<typeof input.mode, ApprovalAuditEntry['action']> = {
    completo: 'REGENERAR',
    outro_tom: 'ALTERAR_TOM',
    outro_visual: 'ALTERAR_VISUAL',
  };

  const auditEntry: ApprovalAuditEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    action: actionMap[input.mode],
    actor: 'Jessica Nalin',
    note:
      input.mode === 'outro_tom'
        ? `Tom ajustado para ${regenerated.toneProfile}.`
        : input.mode === 'outro_visual'
          ? input.visualInstruction?.trim() || 'Nova proposta visual aplicada mantendo a identidade da marca.'
          : 'Conteúdo individual regenerado com nova abordagem editorial.',
    createdAt: new Date().toISOString(),
  };

  const finalPost: ContentPost = {
    ...regenerated,
    publishingState: 'bloqueado_sem_integracao',
    auditLog: [auditEntry, ...(existing.auditLog ?? [])],
  };

  db.posts[idx] = finalPost;
  await saveDatabase(db);
  return finalPost;
}

export async function updateReelsProductionById(
  postId: string,
  workflowPatch: Partial<ReelsProductionWorkflow>,
  sendToApproval = false
): Promise<ContentPost | null> {
  const db = await ensureDatabase();
  const idx = db.posts.findIndex((p) => p.id === postId);
  if (idx === -1) return null;

  const existing = db.posts[idx];
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

  const updated: ContentPost = {
    ...existing,
    reelsProduction: nextProduction,
    status: sendToApproval ? 'aguardando_aprovacao' : existing.status,
    publishingState: 'bloqueado_sem_integracao',
    updatedAt: now,
  };

  db.posts[idx] = updated;
  await saveDatabase(db);
  return updated;
}

export async function deletePost(id: string): Promise<boolean> {
  const db = await ensureDatabase();
  const prevLen = db.posts.length;
  db.posts = db.posts.filter((p) => p.id !== id);
  if (db.posts.length === prevLen) return false;
  await saveDatabase(db);
  return true;
}

export async function applyApprovalDecision(input: {
  postIds: string[];
  action: 'APROVAR' | 'SOLICITAR_ALTERACOES' | 'REJEITAR';
  feedback?: string;
  actor?: string;
}): Promise<ContentPost[]> {
  const db = await ensureDatabase();
  const now = new Date().toISOString();
  const actor = input.actor?.trim() || 'Jessica Nalin';
  const idSet = new Set(input.postIds);

  const nextStatusMap: Record<typeof input.action, ApprovalStatus> = {
    APROVAR: 'aprovado',
    SOLICITAR_ALTERACOES: 'alteracoes_solicitadas',
    REJEITAR: 'rejeitado',
  };

  const updatedItems: ContentPost[] = [];

  db.posts = db.posts.map((post) => {
    if (!idSet.has(post.id)) return post;

    const nextStatus = nextStatusMap[input.action];
    const auditEntry: ApprovalAuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action: input.action,
      actor,
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

  await saveDatabase(db);
  return updatedItems;
}

export async function approveEntireWeeklyBatch(actor = 'Jessica Nalin'): Promise<ContentPost[]> {
  const db = await ensureDatabase();
  const eligibleIds = db.posts
    .filter((p) => p.status !== 'aprovado' && p.status !== 'rejeitado')
    .map((p) => p.id);
  if (eligibleIds.length === 0) return [];
  return applyApprovalDecision({
    postIds: eligibleIds,
    action: 'APROVAR',
    actor,
  });
}

// ============================================================================
// Biblioteca de Mídia Autêntica
// ============================================================================

export async function listMediaAssets(): Promise<MediaAsset[]> {
  const db = await ensureDatabase();
  return [...db.mediaLibrary].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addMediaAsset(asset: MediaAsset): Promise<MediaAsset> {
  const db = await ensureDatabase();
  db.mediaLibrary.unshift(asset);
  await saveDatabase(db);
  return asset;
}

export async function deleteMediaAsset(id: string): Promise<boolean> {
  const db = await ensureDatabase();
  const target = db.mediaLibrary.find((m) => m.id === id);
  if (!target) return false;
  db.mediaLibrary = db.mediaLibrary.filter((m) => m.id !== id);
  await saveDatabase(db);
  return true;
}

// ============================================================================
// Inteligência Comercial — Leads Reais (Nunca inventa leads ou conversões)
// ============================================================================

export async function listLeads(): Promise<PotentialCustomerLead[]> {
  const db = await ensureDatabase();
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
  const db = await ensureDatabase();
  const sourcePost = input.sourcePostId
    ? db.posts.find((p) => p.id === input.sourcePostId)
    : undefined;

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

  db.leads.unshift(lead);
  await saveDatabase(db);
  return lead;
}

export async function updateLeadStage(
  id: string,
  stage: LeadStage,
  notes?: string
): Promise<PotentialCustomerLead | null> {
  const db = await ensureDatabase();
  const idx = db.leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  db.leads[idx] = {
    ...db.leads[idx],
    stage,
    ...(notes !== undefined ? { notes: notes.trim() || undefined } : {}),
  };
  await saveDatabase(db);
  return db.leads[idx];
}

export async function deleteLead(id: string): Promise<boolean> {
  const db = await ensureDatabase();
  const prev = db.leads.length;
  db.leads = db.leads.filter((l) => l.id !== id);
  if (db.leads.length === prev) return false;
  await saveDatabase(db);
  return true;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = await ensureDatabase();
  const posts = db.posts;

  const awaitingApprovalCount = posts.filter((p) => p.status === 'aguardando_aprovacao').length;
  const approvedCount = posts.filter((p) => p.status === 'aprovado').length;
  const changesRequestedCount = posts.filter((p) => p.status === 'alteracoes_solicitadas').length;
  const rejectedCount = posts.filter((p) => p.status === 'rejeitado').length;

  const estimatedReviewMinutes = Math.max(2, awaitingApprovalCount * 2);
  const realLeadsCount = db.leads.length;

  return {
    dataSource: 'demo',
    periodLabel: 'Últimos 7 dias • Métricas de alcance em demonstração',
    totalFollowers: 14820,
    followerGrowthPercent: 4.8,
    followerGrowthCount: 214,
    weeklyReach: db.analyticsDemo.summary.reach,
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
    nextSaturdayLabel: `Sábado às ${db.automationSettings.readyTime} (preparado na ${
      db.automationSettings.preparationDay === 'quinta' ? 'quinta' : 'sexta'
    } às ${db.automationSettings.preparationTime})`,
    batchReadyBeforeSaturday: posts.length >= 7,
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
  const db = await ensureDatabase();
  const leads = [...db.leads].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));

  const postMap = new Map<string, { postId: string; postTitle: string; format: string; count: number }>();
  for (const post of db.posts) {
    postMap.set(post.id, {
      postId: post.id,
      postTitle: post.title,
      format: post.format,
      count: 0,
    });
  }

  for (const lead of leads) {
    if (lead.sourcePostId && postMap.has(lead.sourcePostId)) {
      const entry = postMap.get(lead.sourcePostId)!;
      entry.count += 1;
    }
  }

  const formatLeadCounts: Record<string, number> = {
    carrossel: 0,
    reels: 0,
    stories: 0,
    post_unico: 0,
  };
  for (const lead of leads) {
    if (lead.sourcePostId) {
      const src = db.posts.find((p) => p.id === lead.sourcePostId);
      if (src && formatLeadCounts[src.format] !== undefined) {
        formatLeadCounts[src.format] += 1;
      }
    }
  }

  const report: AnalyticsReport = {
    ...db.analyticsDemo,
    instagramHandle: db.brandProfile.instagramHandle || '@eujessynalin',
    instagramUrl: db.brandProfile.instagramUrl || 'https://www.instagram.com/eujessynalin/',
    summary: {
      ...db.analyticsDemo.summary,
      leadsGenerated: leads.length,
    },
    funnel: [
      { stage: 'Alcance semanal (Demo)', value: db.analyticsDemo.summary.reach, rateLabel: '100%' },
      { stage: 'Visitas ao perfil (Demo)', value: db.analyticsDemo.summary.profileVisits, rateLabel: '7,5% do alcance' },
      { stage: 'Salvamentos qualificados (Demo)', value: db.analyticsDemo.summary.saves, rateLabel: '4,9% do alcance' },
      {
        stage: 'Interessados reais registrados',
        value: leads.length,
        rateLabel: leads.length > 0 ? 'Dados reais da equipe' : 'Nenhum registro ainda',
      },
    ],
    formatPerformance: db.analyticsDemo.formatPerformance.map((row) => ({
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
  const db = await ensureDatabase();
  return db.automationSettings;
}

export async function updateAutomationSettings(
  partial: Partial<AutomationSettings>
): Promise<AutomationSettings> {
  const db = await ensureDatabase();
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
  await saveDatabase(db);
  return updated;
}

export async function resetDemoData(): Promise<MarketingDatabase> {
  const seed = createDemoSeedData();
  await saveDatabase(seed);
  return seed;
}
