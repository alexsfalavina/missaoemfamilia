import type { UserRole } from '@/types/marketing';

export interface RoleVisualPermissions {
  canEdit: boolean;
  canApprove: boolean;
  canManageMedia: boolean;
  canManageLeads: boolean;
  canResetDemo: boolean;
  isOwner: boolean;
  isReadOnly: boolean;
}

/**
 * Mapeamento único de permissões visuais para os 3 papéis (owner, editor, viewer).
 * - Enquanto `role` é null/undefined (carregando), falha fechado em modo somente leitura.
 * - A autoridade final de segurança permanece sempre no servidor (`requireApiAuth` + RLS).
 */
export function getRolePermissions(role: UserRole | null | undefined): RoleVisualPermissions {
  if (role === 'owner') {
    return {
      canEdit: true,
      canApprove: true,
      canManageMedia: true,
      canManageLeads: true,
      canResetDemo: true,
      isOwner: true,
      isReadOnly: false,
    };
  }

  if (role === 'editor') {
    return {
      canEdit: true,
      canApprove: true,
      canManageMedia: true,
      canManageLeads: true,
      canResetDemo: false,
      isOwner: false,
      isReadOnly: false,
    };
  }

  return {
    canEdit: false,
    canApprove: false,
    canManageMedia: false,
    canManageLeads: false,
    canResetDemo: false,
    isOwner: false,
    isReadOnly: true,
  };
}
