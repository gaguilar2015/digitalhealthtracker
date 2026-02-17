import type { PermissionLevel } from '@/types';

interface HasOwnership {
  assigned_to?: string | null;
  owner_id?: string | null;
  created_by?: string | null;
  uploaded_by?: string | null;
}

export function canEdit(permission: PermissionLevel, entity: HasOwnership, userId: string): boolean {
  if (permission === 'viewer') return false;
  if (permission === 'admin') return true;
  return (
    entity.assigned_to === userId ||
    entity.owner_id === userId ||
    entity.created_by === userId
  );
}

export function canDelete(permission: PermissionLevel, entity: HasOwnership, userId: string): boolean {
  if (permission === 'viewer') return false;
  if (permission === 'admin') return true;
  return (
    entity.assigned_to === userId ||
    entity.owner_id === userId ||
    entity.created_by === userId ||
    entity.uploaded_by === userId
  );
}
