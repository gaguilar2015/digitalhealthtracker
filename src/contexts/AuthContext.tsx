import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { insertAuditLog } from '@/lib/api/auditLogs';
import type { TeamMember, PermissionLevel } from '@/types';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  teamMember: TeamMember | null;
  isLoading: boolean;
  permissionLevel: PermissionLevel | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeamMember = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setTeamMember(data);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchTeamMember(s.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchTeamMember(s.user.id);
        if (event === 'SIGNED_IN') {
          insertAuditLog({ user_id: s.user.id, event_type: 'login' }).catch(() => {});
        }
      } else {
        setTeamMember(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchTeamMember]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    if (user) insertAuditLog({ user_id: user.id, event_type: 'logout' }).catch(() => {});
    await supabase.auth.signOut();
    setTeamMember(null);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        teamMember,
        isLoading,
        permissionLevel: teamMember?.permission_level ?? null,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
