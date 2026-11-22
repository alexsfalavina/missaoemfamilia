import type {
  ApprovalStatus,
  AspectRatioSpec,
  ContentCategory,
  ContentFormat,
  DesignTemplateId,
} from '@/types/marketing';

export const CATEGORY_META: Record<
  ContentCategory,
  { label: string; shortLabel: string; description: string; toneClass: string }
> = {
  educativo: {
    label: 'Educativo',
    shortLabel: 'Educativo',
    description: 'Ensina ferramentas práticas de educação parental e PNL aplicáveis no dia a dia.',
    toneClass: 'badge-green',
  },
  emocional: {
    label: 'Emocional',
    shortLabel: 'Emocional',
    description: 'Gera identificação profunda, acolhimento e conexão genuína com pais e mães.',
    toneClass: 'badge-purple',
  },
  autoridade: {
    label: 'Construção de Autoridade',
    shortLabel: 'Autoridade',
    description: 'Posiciona Jessica Nalin e o Método ALMA como referência segura em família.',
    toneClass: 'badge-gold',
  },
  engajamento: {
    label: 'Engajamento',
    shortLabel: 'Engajamento',
    description: 'Estimula conversas nos comentários e Directs para identificar famílias interessadas.',
    toneClass: 'badge-teal',
  },
  comercial: {
    label: 'Comercial (Conversão)',
    shortLabel: 'Comercial',
    description: 'Convida diretamente para mentoria, diagnóstico familiar ou lista de espera do Método ALMA.',
    toneClass: 'badge-plum',
  },
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
