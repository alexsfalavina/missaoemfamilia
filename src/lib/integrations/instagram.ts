import type { ContentPost } from '@/types/marketing';

export const OFFICIAL_INSTAGRAM_USERNAME = 'eujessynalin';
export const OFFICIAL_INSTAGRAM_HANDLE = '@eujessynalin';
export const OFFICIAL_INSTAGRAM_URL = 'https://www.instagram.com/eujessynalin/';

export interface InstagramServerConfig {
  configured: boolean;
  publishingEnabled: false;
  accountIdPresent: boolean;
  username: string;
  handle: string;
  profileUrl: string;
}

export interface InstagramPublishGuardResult {
  ok: false;
  code: 'PUBLISHING_DISABLED' | 'HUMAN_APPROVAL_REQUIRED';
  message: string;
}

export interface IInstagramGraphService {
  getConfig(): InstagramServerConfig;
  publishPost(post: ContentPost): Promise<InstagramPublishGuardResult>;
}

/**
 * Lê variáveis da Instagram Graph API exclusivamente no servidor.
 * REGRA DE SEGURANÇA:
 * - Nunca simular publicação bem-sucedida.
 * - Nunca publicar sem aprovação humana explícita.
 * - Publicação direta permanece bloqueada na Etapa 1.
 */
export function getInstagramServerConfig(): InstagramServerConfig {
  const hasToken = Boolean(process.env.INSTAGRAM_ACCESS_TOKEN?.trim());
  const hasAccountId = Boolean(process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID?.trim());
  const rawUsername = (process.env.INSTAGRAM_USERNAME?.trim() || OFFICIAL_INSTAGRAM_USERNAME).replace(
    /^@/,
    ''
  );
  const profileUrl =
    process.env.INSTAGRAM_PROFILE_URL?.trim() || `https://www.instagram.com/${rawUsername}/`;

  return {
    configured: hasToken && hasAccountId,
    publishingEnabled: false,
    accountIdPresent: hasAccountId,
    username: rawUsername,
    handle: `@${rawUsername}`,
    profileUrl,
  };
}

class GuardedInstagramGraphService implements IInstagramGraphService {
  getConfig(): InstagramServerConfig {
    return getInstagramServerConfig();
  }

  async publishPost(post: ContentPost): Promise<InstagramPublishGuardResult> {
    if (post.status !== 'aprovado' || !post.approvedAt) {
      return {
        ok: false,
        code: 'HUMAN_APPROVAL_REQUIRED',
        message:
          'Bloqueado: nenhum conteúdo pode ser publicado sem aprovação humana explícita na Central de Aprovação.',
      };
    }

    return {
      ok: false,
      code: 'PUBLISHING_DISABLED',
      message:
        'A publicação direta no Instagram ainda não está ativada nesta etapa. O conteúdo permanece aprovado e agendado localmente até que a integração oficial da Meta Graph API seja autorizada.',
    };
  }
}

export function getInstagramGraphService(): IInstagramGraphService {
  return new GuardedInstagramGraphService();
}
