'use client';

import { useEffect, useState } from 'react';
import type { AuthUser, UserRole } from '@/types/marketing';
import { getRolePermissions, type RoleVisualPermissions } from '@/lib/auth/permissions';

export interface UseCurrentUserResult extends RoleVisualPermissions {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
}

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.authenticated && data?.user) {
          setUser(data.user as AuthUser);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const role: UserRole | null = user?.role ?? null;
  return {
    user,
    role,
    loading,
    ...getRolePermissions(role),
  };
}
