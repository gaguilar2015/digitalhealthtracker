import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { PermissionLevel } from '@/types';

interface PermissionGateProps {
  required: PermissionLevel;
  children: ReactNode;
  fallback?: ReactNode;
}

const LEVEL_RANK: Record<PermissionLevel, number> = { admin: 3, member: 2, viewer: 1 };

export function PermissionGate({ required, children, fallback = null }: PermissionGateProps) {
  const { permissionLevel } = useAuth();
  if (!permissionLevel) return <>{fallback}</>;
  if (LEVEL_RANK[permissionLevel] >= LEVEL_RANK[required]) return <>{children}</>;
  return <>{fallback}</>;
}
