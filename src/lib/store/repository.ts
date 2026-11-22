import { promises as fs } from 'fs';
import path from 'path';
import type {
  AnalyticsReport,
  ApprovalAuditEntry,
  ApprovalStatus,
  AutomationSettings,
  BrandProfile,
  ContentPost,
  DashboardMetrics,
  IntegrationStatus,
  MarketingDatabase,
} from '@/types/marketing';
import { createDemoSeedData } from '@/lib/data/demo-seed';
import { getSupabaseServerConfig } from '@/lib/supabase/client';
import { getGeminiServerConfig } from '@/lib/integrations/gemini';
import { getInstagramServerConfig } from '@/lib/integrations/instagram';
import { getWeekdayNameFromDate } from '@/lib/constants/labels';

const DATA_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'jessica-marketing-db.json');

let initPromise: Promise<MarketingDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function ensureDatabase(): Promise<MarketingDatabase> {
  try {
    const raw = await fs.readFile(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as MarketingDatabase;
    if (!parsed || !parsed.brandProfile || !Array.isArray(parsed.posts)) {
      throw new Error('Estrutura local inválida');
    }
    return parsed;
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
        statusLabel: gemini.configured ? `Pronto (${gemini.model})` : 'Motor de Demonstração (Sem Custo)',
        detail: gemini.configured
          ? 'Chave detectada no servidor. Aguardando autorização explícita para chamadas externas.'
          : 'Usando gerador estratégico local sem consumo de APIs pagas.',
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

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const db = await ensureDatabase();
  const posts = db.posts;

  const awaitingApprovalCount = posts.filter((p) => p.status === 'aguardando_aprovacao').length;
  const approvedCount = posts.filter((p) => p.status === 'aprovado').length;
  const changesRequestedCount = posts.filter((p) => p.status === 'alteracoes_solicitadas').length;
  const rejectedCount = posts.filter((p) => p.status === 'rejeitado').length;

  const estimatedReviewMinutes = Math.max(2, awaitingApprovalCount * 2);

  return {
    dataSource: 'demo',
    periodLabel: 'Últimos 7 dias • Dados de demonstração',
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
    potentialCustomersCount: db.analyticsDemo.summary.leadsGenerated,
    potentialCustomersGrowthPercent: 18.5,
    estimatedReviewMinutes,
    nextSaturdayLabel: 'Próximo sábado às ' + db.automationSettings.readyTime,
  };
}

export async function getAnalyticsReport(): Promise<AnalyticsReport> {
  const db = await ensureDatabase();
  return {
    ...db.analyticsDemo,
    instagramHandle: db.brandProfile.instagramHandle || '@eujessynalin',
    instagramUrl: db.brandProfile.instagramUrl || 'https://www.instagram.com/eujessynalin/',
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
    // Travas obrigatórias de segurança: nunca permite publicação sem aprovação humana
    requireExplicitHumanApproval: true,
    autoPublishEnabled: false,
    categoryMix: {
      ...db.automationSettings.categoryMix,
      ...(partial.categoryMix ?? {}),
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
