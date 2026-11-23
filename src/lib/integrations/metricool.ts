import type { ContentPost } from '@/types/marketing';
import {
  OFFICIAL_INSTAGRAM_HANDLE,
  OFFICIAL_INSTAGRAM_URL,
  OFFICIAL_INSTAGRAM_USERNAME,
} from '@/lib/integrations/instagram';

export interface MetricoolServerConfig {
  configured: boolean;
  publishingEnabled: false;
  targetHandle: string;
  targetProfileUrl: string;
  hasApiToken: boolean;
  hasUserId: boolean;
  hasBlogId: boolean;
}

export interface MetricoolGuardResult {
  ok: false;
  code: 'METRICOOL_DISABLED_P1' | 'HUMAN_APPROVAL_REQUIRED' | 'MANUAL_STORY_ACTION_REQUIRED';
  message: string;
}

export interface IMetricoolService {
  getConfig(): MetricoolServerConfig;
  scheduleApprovedPost(post: ContentPost): Promise<MetricoolGuardResult>;
}

/**
 * Arquitetura server-side preparada para integração futura com o Metricool
 * (solução escolhida para publicação e análise de @eujessynalin).
 *
 * REGRAS DA P1:
 * - Não realiza chamadas externas nem publicação automática.
 * - Nenhuma chave é exposta ao navegador.
 * - Exige aprovação humana explícita antes de qualquer envio futuro.
 */
export function getMetricoolServerConfig(): MetricoolServerConfig {
  const hasApiToken = Boolean(process.env.METRICOOL_API_TOKEN?.trim());
  const hasUserId = Boolean(process.env.METRICOOL_USER_ID?.trim());
  const hasBlogId = Boolean(process.env.METRICOOL_BLOG_ID?.trim());
  const rawUser = (process.env.INSTAGRAM_USERNAME?.trim() || OFFICIAL_INSTAGRAM_USERNAME).replace(
    /^@/,
    ''
  );

  return {
    configured: hasApiToken && hasUserId && hasBlogId,
    publishingEnabled: false,
    targetHandle: rawUser ? `@${rawUser}` : OFFICIAL_INSTAGRAM_HANDLE,
    targetProfileUrl:
      process.env.INSTAGRAM_PROFILE_URL?.trim() ||
      (rawUser ? `https://www.instagram.com/${rawUser}/` : OFFICIAL_INSTAGRAM_URL),
    hasApiToken,
    hasUserId,
    hasBlogId,
  };
}

class GuardedMetricoolService implements IMetricoolService {
  getConfig(): MetricoolServerConfig {
    return getMetricoolServerConfig();
  }

  async scheduleApprovedPost(post: ContentPost): Promise<MetricoolGuardResult> {
    if (post.status !== 'aprovado' || !post.approvedAt) {
      return {
        ok: false,
        code: 'HUMAN_APPROVAL_REQUIRED',
        message:
          'Bloqueado: nenhum conteúdo pode ser agendado no Metricool sem aprovação humana explícita na Central de Aprovação.',
      };
    }

    if (post.format === 'stories' && post.storyExecutionMode === 'acao_manual_instagram') {
      return {
        ok: false,
        code: 'MANUAL_STORY_ACTION_REQUIRED',
        message:
          'Este Story exige adesivos interativos manuais (enquete/caixinha) dentro do aplicativo do Instagram e não deve ser enviado para publicação automática.',
      };
    }

    return {
      ok: false,
      code: 'METRICOOL_DISABLED_P1',
      message:
        'A arquitetura está preparada para o Metricool (@eujessynalin), mas a integração e publicação automática permanecem desativadas na P1.',
    };
  }
}

export function getMetricoolService(): IMetricoolService {
  return new GuardedMetricoolService();
}
