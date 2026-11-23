import type {
  ApprovalStatus,
  AspectRatioSpec,
  ContentCategory,
  ContentFormat,
  ContentToneProfile,
  DesignTemplateId,
  LeadInterestType,
  LeadStage,
  MediaAssetCategory,
  MediaAuthenticity,
  ReelsProductionWorkflow,
  StoryExecutionMode,
  StrategicObjective,
} from '@/types/marketing';

export const CATEGORY_META: Record<
  ContentCategory,
  { label: string; shortLabel: string; description: string; toneClass: string }
> = {
  educativo: {
    label: 'Educativo',
    shortLabel: 'Educativo',
    description: 'Desenvolvimento infantil, regulação emocional e ferramentas práticas de parentalidade positiva.',
    toneClass: 'badge-green',
  },
  emocional: {
    label: 'Relacionamento & Vínculo',
    shortLabel: 'Vínculo',
    description: 'Conexão familiar genuína e reflexão madura sobre o cotidiano dos pais, sem clichês motivacionais.',
    toneClass: 'badge-purple',
  },
  autoridade: {
    label: 'Autoridade Profissional',
    shortLabel: 'Autoridade',
    description: 'Aprofundamento técnico acessível sobre o Método ALMA e PNL aplicada à parentalidade.',
    toneClass: 'badge-gold',
  },
  engajamento: {
    label: 'Diálogo & Comunidade',
    shortLabel: 'Engajamento',
    description: 'Perguntas qualificadas para escutar dúvidas reais das famílias e orientar com responsabilidade.',
    toneClass: 'badge-teal',
  },
  comercial: {
    label: 'Captação & Serviços',
    shortLabel: 'Comercial',
    description: 'Apresentação clara e verificada da Mentoria Familiar e avaliações, sem urgência artificial.',
    toneClass: 'badge-plum',
  },
};

export const STRATEGIC_OBJECTIVE_META: Record<
  StrategicObjective,
  { code: 'A' | 'B' | 'C'; label: string; shortLabel: string; description: string; toneClass: string }
> = {
  crescimento_audiencia: {
    code: 'A',
    label: 'A. Crescimento de audiência',
    shortLabel: 'A • Crescimento',
    description: 'Conteúdo compartilhável e útil para alcançar novos pais interessados em educação parental.',
    toneClass: 'badge-teal',
  },
  autoridade_profissional: {
    code: 'B',
    label: 'B. Autoridade profissional',
    shortLabel: 'B • Autoridade',
    description: 'Demonstra domínio real em desenvolvimento infantil, regulação emocional, PNL e Método ALMA.',
    toneClass: 'badge-purple',
  },
  captacao_clientes: {
    code: 'C',
    label: 'C. Captação de clientes',
    shortLabel: 'C • Captação',
    description: 'Conecta necessidades reais das famílias aos serviços verificados de Jessica Nalin.',
    toneClass: 'badge-green',
  },
};

export const TONE_PROFILE_META: Record<
  ContentToneProfile,
  { label: string; description: string }
> = {
  acolhedor_sereno: {
    label: 'Acolhedor e sereno',
    description: 'Escuta empática e linguagem calma, sem culpa ou julgamento.',
  },
  tecnico_acessivel: {
    label: 'Técnico e acessível',
    description: 'Explica desenvolvimento infantil e PNL com clareza e embasamento.',
  },
  firme_pratico: {
    label: 'Firme e prático',
    description: 'Direto ao ponto, focado em combinados, limites saudáveis e rotina.',
  },
  reflexivo_profundo: {
    label: 'Reflexivo e profundo',
    description: 'Convida pais a observarem vínculos, valores e amadurecimento emocional.',
  },
};

export const STORY_MODE_META: Record<
  StoryExecutionMode,
  { label: string; shortLabel: string; description: string; toneClass: string }
> = {
  publicacao_automatica: {
    label: 'Apto para publicação automática (Etapa 2)',
    shortLabel: 'Story Automático',
    description: 'Sequência informativa/visual sem adesivos interativos — poderá ser agendada via API oficial.',
    toneClass: 'badge-green',
  },
  acao_manual_instagram: {
    label: 'Requer ação manual no Instagram',
    shortLabel: 'Ação Manual (Adesivos)',
    description: 'Inclui enquete, caixinha de perguntas ou adesivo interativo que precisa ser inserido manualmente no app do Instagram.',
    toneClass: 'badge-gold',
  },
};

export const MEDIA_CATEGORY_META: Record<MediaAssetCategory, { label: string }> = {
  foto_pessoal: { label: 'Fotografia pessoal' },
  foto_profissional: { label: 'Fotografia profissional' },
  video: { label: 'Vídeo gravado' },
  logo_marca: { label: 'Logo oficial' },
  material_existente: { label: 'Material de marketing' },
};

export const MEDIA_AUTHENTICITY_META: Record<
  MediaAuthenticity,
  { label: string; shortLabel: string; toneClass: string }
> = {
  autentico_jessica: {
    label: 'Foto/Vídeo autêntico de Jessica',
    shortLabel: 'Autêntico',
    toneClass: 'badge-green',
  },
  logo_oficial: {
    label: 'Identidade visual oficial',
    shortLabel: 'Logo Oficial',
    toneClass: 'badge-purple',
  },
  ilustracao_demo: {
    label: 'Ilustração demonstrativa (não é foto real de Jessica)',
    shortLabel: 'Ilustração Demo',
    toneClass: 'badge-gold',
  },
};

export const REELS_STAGE_META: Record<
  ReelsProductionWorkflow['stage'],
  { label: string; toneClass: string }
> = {
  roteiro_pronto: { label: '1. Roteiro pronto (aguardando gravação)', toneClass: 'badge-neutral' },
  video_enviado: { label: '2. Vídeo enviado por Jessica', toneClass: 'badge-purple' },
  edicao_preparada: { label: '3. Legendas, cortes e capa preparados', toneClass: 'badge-gold' },
  pronto_para_aprovacao: { label: '4. Vídeo finalizado para aprovação', toneClass: 'badge-green' },
};

export const LEAD_INTEREST_META: Record<
  LeadInterestType,
  { label: string; shortLabel: string; toneClass: string }
> = {
  mentoria: {
    label: 'Interessado em Mentoria Familiar',
    shortLabel: 'Mentoria',
    toneClass: 'badge-purple',
  },
  avaliacao_familiar: {
    label: 'Interessado em Avaliação Familiar',
    shortLabel: 'Avaliação Familiar',
    toneClass: 'badge-green',
  },
  informacao: {
    label: 'Pedido de Informação',
    shortLabel: 'Informação',
    toneClass: 'badge-teal',
  },
};

export const LEAD_STAGE_META: Record<
  LeadStage,
  { label: string; toneClass: string }
> = {
  novo: { label: 'Novo contato', toneClass: 'status-pending' },
  em_conversa: { label: 'Em conversa', toneClass: 'badge-purple' },
  agendado: { label: 'Conversa agendada', toneClass: 'badge-teal' },
  concluido: { label: 'Convertido / Concluído', toneClass: 'status-approved' },
};

export const FORMAT_META: Record<
  ContentFormat,
  { label: string; aspectRatio: AspectRatioSpec; dimensionsLabel: string }
> = {
  carrossel: {
    label: 'Carrossel',
    aspectRatio: '1080x1350',
    dimensionsLabel: '1080 × 1350 px (Multi-slides)',
  },
  reels: {
    label: 'Reels',
    aspectRatio: '1080x1920',
    dimensionsLabel: '1080 × 1920 px (Vertical 9:16)',
  },
  post_unico: {
    label: 'Post Único',
    aspectRatio: '1080x1350',
    dimensionsLabel: '1080 × 1350 px (Feed 4:5)',
  },
  stories: {
    label: 'Stories',
    aspectRatio: '1080x1920',
    dimensionsLabel: '1080 × 1920 px (Sequência 9:16)',
  },
};

export const STATUS_META: Record<
  ApprovalStatus,
  { label: string; shortLabel: string; toneClass: string }
> = {
  aguardando_aprovacao: {
    label: 'Aguardando aprovação',
    shortLabel: 'Pendente',
    toneClass: 'status-pending',
  },
  aprovado: {
    label: 'Aprovado',
    shortLabel: 'Aprovado',
    toneClass: 'status-approved',
  },
  alteracoes_solicitadas: {
    label: 'Alterações solicitadas',
    shortLabel: 'Ajustes',
    toneClass: 'status-changes',
  },
  rejeitado: {
    label: 'Rejeitado',
    shortLabel: 'Rejeitado',
    toneClass: 'status-rejected',
  },
};

export const TEMPLATE_META: Record<
  DesignTemplateId,
  { label: string; description: string; previewBg: string; accent: string }
> = {
  ametista_editorial: {
    label: 'Ametista Editorial',
    description: 'Fundo claro suave com tipografia ametista e detalhes em verde sálvia.',
    previewBg: '#FAF7FD',
    accent: '#7B3FA0',
  },
  verde_acolhimento: {
    label: 'Verde Acolhimento',
    description: 'Paleta verde sálvia serena para conteúdos educativos e passos práticos.',
    previewBg: '#EFF7F4',
    accent: '#3E8B74',
  },
  metodo_alma_dourado: {
    label: 'Método ALMA Dourado',
    description: 'Moldura elegante inspirada na identidade visual do Método ALMA.',
    previewBg: '#FCF9F3',
    accent: '#B3844E',
  },
  retrato_destaque: {
    label: 'Retrato & Fotografia',
    description: 'Fotografia em destaque com gradiente legível e assinatura JN.',
    previewBg: '#2E1E3B',
    accent: '#9D5FD0',
  },
};

export const WEEKDAYS_PT = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const;

export function formatPtDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return isoDate;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function formatPtDateShort(isoDate: string): string {
  const [, month, day] = isoDate.split('-').map(Number);
  if (!month || !day) return isoDate;
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

export function formatNumberPt(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export const USER_ROLE_META = {
  owner: { label: 'Proprietária', toneClass: 'badge-purple' },
  editor: { label: 'Editor(a)', toneClass: 'badge-green' },
  viewer: { label: 'Visualização', toneClass: 'badge-neutral' },
} as const;

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, (d || 1) + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getNextMondayIso(referenceDate = new Date()): string {
  const dt = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );
  const day = dt.getDay(); // 0=Dom, 1=Seg, ...
  const diffToMonday = day === 1 ? 0 : day === 0 ? 1 : 8 - day;
  dt.setDate(dt.getDate() + diffToMonday);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getWeekdayNameFromDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return 'Segunda-feira';
  const date = new Date(year, month - 1, day);
  const map = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado',
  ];
  return map[date.getDay()] ?? 'Segunda-feira';
}
