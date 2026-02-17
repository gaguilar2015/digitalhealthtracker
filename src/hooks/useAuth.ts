import { useAuthContext } from '@/contexts/AuthContext';

export function useAuth() {
  const ctx = useAuthContext();
  return {
    ...ctx,
    isAdmin: ctx.permissionLevel === 'admin',
    isMember: ctx.permissionLevel === 'member',
    isViewer: ctx.permissionLevel === 'viewer',
  };
}
