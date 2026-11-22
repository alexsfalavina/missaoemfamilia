export type DataSourceMode = 'demo' | 'live';

export type ContentCategory =
  | 'educativo'
  | 'emocional'
  | 'autoridade'
  | 'engajamento'
  | 'comercial';

export type ContentFormat =
  | 'carrossel'
  | 'reels'
  | 'post_unico'
  | 'stories';

export type ApprovalStatus =
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'alteracoes_solicitadas'
  | 'rejeitado';

export type DesignTemplateId =
  | 'ametista_editorial'
  | 'verde_acolhimento'
  | 'metodo_alma_dourado'
  | 'retrato_destaque';

export type AspectRatioSpec = '1080x1350' | '1080x1920';

export interface CarouselSlide {
  id: string;
  order: number;
  eyebrow?: string;
  headline: string;
  body: string;
  footer?: string;
  imageUrl?: string;
  template: DesignTemplateId;
}

export interface ReelsScriptScene {
  id: string;
  timeRange: string;
  visualDirection: string;
  spokenLine: string;
  onScreenText: string;
}

export interface ApprovalAuditEntry {
  id: string;
  action: 'APROVAR' | 'SOLICITAR_ALTERACOES' | 'REJEITAR' | 'REAGENDAR' | 'EDITAR';
  actor: string;
  note?: string;
  createdAt: string;
}

export interface ContentPost {
  id: string;
  weekLabel: string;
  dayOfWeek: string;
  title: string;
  category: ContentCategory;
  format: ContentFormat;
  aspectRatio: AspectRatioSpec;
  marketingObjective: string;
  conversionFocus: string;
  caption: string;
  hashtags: string[];
  cta: string;
  recommendedDate: string; // YYYY-MM-DD
  recommendedTime: string; // HH:mm
  status: ApprovalStatus;
  approvalFeedback?: string;
  approvedAt?: string;
  approvedBy?: string;
  publishingState: 'nao_publicado' | 'bloqueado_sem_integracao';
  dataSource: DataSourceMode;
  slides: CarouselSlide[];
  reelsScript?: ReelsScriptScene[];
  auditLog: ApprovalAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandProfile {
  id: string;
  brandName: string;
  instagramHandle: string;
  instagramUrl: string;
  niche: string;
  targetAudience: string;
  servicesOffered: string[];
  brandVoice: string;
  brandValues: string[];
  visualIdentity: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    typographyDisplay: string;
    typographyBody: string;
    visualGuidelines: string;
  };
  businessObjectives: string[];
  updatedAt: string;
}

export interface DashboardMetrics {
  dataSource: DataSourceMode;
  periodLabel: string;
  totalFollowers: number;
  followerGrowthPercent: number;
  followerGrowthCount: number;
  weeklyReach: number;
  weeklyReachGrowthPercent: number;
  engagementRate: number;
  engagementGrowthPercent: number;
  publishedPostsCount: number;
  awaitingApprovalCount: number;
  approvedCount: number;
  changesRequestedCount: number;
  rejectedCount: number;
  potentialCustomersCount: number;
  potentialCustomersGrowthPercent: number;
  estimatedReviewMinutes: number;
  nextSaturdayLabel: string;
}

export interface AnalyticsReport {
  dataSource: DataSourceMode;
  instagramHandle: string;
  instagramUrl: string;
  periodLabel: string;
  summary: {
    reach: number;
    shares: number;
    saves: number;
    comments: number;
    profileVisits: number;
    newFollowers: number;
    leadsGenerated: number;
  };
  dailyTrend: Array<{
    day: string;
    reach: number;
    saves: number;
    leads: number;
  }>;
  funnel: Array<{
    stage: string;
    value: number;
    rateLabel: string;
  }>;
  formatPerformance: Array<{
    format: ContentFormat;
    label: string;
    avgReach: number;
    avgSaves: number;
    leads: number;
  }>;
}

export interface AutomationSettings {
  id: string;
  enabled: boolean;
  reviewDay: 'sabado' | 'sexta' | 'domingo';
  readyTime: string; // HH:mm
  postsPerWeek: number;
  notificationChannel: 'whatsapp' | 'email' | 'painel';
  notificationRecipient: string;
  requireExplicitHumanApproval: true; // Sempre obrigatório
  autoPublishEnabled: false; // Sempre bloqueado na Etapa 1
  categoryMix: Record<ContentCategory, number>;
  lastPreparedAt: string;
  nextPreparationAt: string;
  updatedAt: string;
}

export interface IntegrationStatus {
  mode: DataSourceMode;
  instagramPublishingAllowed: false;
  services: {
    supabase: {
      configured: boolean;
      statusLabel: string;
      detail: string;
    };
    gemini: {
      configured: boolean;
      statusLabel: string;
      detail: string;
    };
    instagram: {
      configured: boolean;
      statusLabel: string;
      detail: string;
    };
  };
}

export interface MarketingDatabase {
  brandProfile: BrandProfile;
  posts: ContentPost[];
  automationSettings: AutomationSettings;
  analyticsDemo: AnalyticsReport;
}
