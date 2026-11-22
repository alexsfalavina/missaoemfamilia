export type DataSourceMode = 'demo' | 'live';

export type ContentCategory =
  | 'educativo'
  | 'emocional'
  | 'autoridade'
  | 'engajamento'
  | 'comercial';

export type StrategicObjective =
  | 'crescimento_audiencia'
  | 'autoridade_profissional'
  | 'captacao_clientes';

export type ContentToneProfile =
  | 'acolhedor_sereno'
  | 'tecnico_acessivel'
  | 'firme_pratico'
  | 'reflexivo_profundo';

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

export type StoryExecutionMode =
  | 'publicacao_automatica'
  | 'acao_manual_instagram';

export type MediaAssetCategory =
  | 'foto_pessoal'
  | 'foto_profissional'
  | 'video'
  | 'logo_marca'
  | 'material_existente';

export type MediaAuthenticity =
  | 'autentico_jessica'
  | 'logo_oficial'
  | 'ilustracao_demo';

export interface MediaAsset {
  id: string;
  name: string;
  category: MediaAssetCategory;
  authenticity: MediaAuthenticity;
  url: string;
  mimeType: string;
  fileSizeBytes?: number;
  notes?: string;
  createdAt: string;
}

export interface CarouselSlide {
  id: string;
  order: number;
  eyebrow?: string;
  headline: string;
  body: string;
  footer?: string;
  imageUrl?: string;
  imageAuthenticity?: MediaAuthenticity;
  template: DesignTemplateId;
}

export interface ReelsScriptScene {
  id: string;
  timeRange: string;
  visualDirection: string;
  spokenLine: string;
  onScreenText: string;
}

export interface ReelsSubtitleCue {
  id: string;
  startTime: string; // 00:00
  endTime: string; // 00:05
  text: string;
}

export interface ReelsProductionWorkflow {
  stage:
    | 'roteiro_pronto'
    | 'video_enviado'
    | 'edicao_preparada'
    | 'pronto_para_aprovacao';
  uploadedVideoAssetId?: string;
  uploadedVideoUrl?: string;
  uploadedVideoName?: string;
  subtitles: ReelsSubtitleCue[];
  editingSuggestions: string[];
  coverReady: boolean;
  updatedAt: string;
}

export interface ApprovalAuditEntry {
  id: string;
  action:
    | 'APROVAR'
    | 'SOLICITAR_ALTERACOES'
    | 'REJEITAR'
    | 'REAGENDAR'
    | 'EDITAR'
    | 'REGENERAR'
    | 'ALTERAR_TOM'
    | 'ALTERAR_VISUAL';
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
  strategicObjective: StrategicObjective;
  toneProfile: ContentToneProfile;
  format: ContentFormat;
  aspectRatio: AspectRatioSpec;
  definedAudience: string;
  openingHook: string;
  educationalValue: string;
  marketingObjective: string;
  conversionFocus: string;
  serviceConnection?: string;
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
  storyExecutionMode?: StoryExecutionMode;
  storyManualInstructions?: string;
  slides: CarouselSlide[];
  reelsScript?: ReelsScriptScene[];
  reelsProduction?: ReelsProductionWorkflow;
  auditLog: ApprovalAuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface VerifiedCommercialInfo {
  enrollmentProcess: string;
  activeOfferNote: string;
  consultationFormat: string;
  avoidClaimsNote: string;
}

export interface BrandProfile {
  id: string;
  brandName: string;
  instagramHandle: string;
  instagramUrl: string;
  niche: string;
  positioningPillars: string[];
  targetAudience: string;
  servicesOffered: string[];
  verifiedCommercialInfo: VerifiedCommercialInfo;
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

export type LeadInterestType =
  | 'mentoria'
  | 'avaliacao_familiar'
  | 'informacao';

export type LeadStage = 'novo' | 'em_conversa' | 'agendado' | 'concluido';

export interface PotentialCustomerLead {
  id: string;
  contactName: string;
  instagramHandle?: string;
  interestType: LeadInterestType;
  sourcePostId?: string;
  sourcePostTitle?: string;
  channel: 'direct' | 'comentario' | 'link_bio' | 'whatsapp';
  stage: LeadStage;
  notes?: string;
  recordedAt: string;
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
  potentialCustomersSource: 'real_registrado' | 'sem_registros';
  potentialCustomersGrowthPercent: number;
  estimatedReviewMinutes: number;
  nextSaturdayLabel: string;
  batchReadyBeforeSaturday: boolean;
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
  preparationDay: 'quinta' | 'sexta';
  preparationTime: string; // HH:mm (antes de sábado)
  readyTime: string; // HH:mm (sábado)
  postsPerWeek: number;
  notificationChannel: 'whatsapp' | 'email' | 'painel';
  notificationRecipient: string;
  requireExplicitHumanApproval: true;
  autoPublishEnabled: false;
  categoryMix: Record<ContentCategory, number>;
  objectiveMix: Record<StrategicObjective, number>;
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
  mediaLibrary: MediaAsset[];
  leads: PotentialCustomerLead[];
  automationSettings: AutomationSettings;
  analyticsDemo: AnalyticsReport;
}
