import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { canEdit, canDelete } from '@/lib/utils';

interface HasOwnership {
  assigned_to?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  uploaded_by?: string | null;
}

export function usePermissions(entity?: HasOwnership) {
  const { permissionLevel, user } = useAuth();

  return useMemo(() => {
    if (!permissionLevel || !user) {
      return { canEditItem: false, canDeleteItem: false };
    }
    if (!entity) {
      return {
        canEditItem: permissionLevel !== 'viewer',
        canDeleteItem: permissionLevel !== 'viewer',
      };
    }
    return {
      canEditItem: canEdit(permissionLevel, entity, user.id),
      canDeleteItem: canDelete(permissionLevel, entity, user.id),
    };
  }, [permissionLevel, user, entity]);
}
