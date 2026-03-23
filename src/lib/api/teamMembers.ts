import { supabase } from '../supabase';
import type { TeamMember, UpdateTeamMember } from '@/types';
import type { PermissionLevel } from '@/types';

export async function getAll(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('full_name');
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCurrent(): Promise<TeamMember | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, member: UpdateTeamMember): Promise<TeamMember> {
  const { data, error } = await supabase
    .from('team_members')
    .update(member)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deactivate(id: string): Promise<TeamMember> {
  return update(id, { is_active: false });
}

export async function reactivate(id: string): Promise<TeamMember> {
  return update(id, { is_active: true });
}

export async function invite(
  email: string,
  fullName: string,
  title: string | null,
  permissionLevel: PermissionLevel,
  password: string,
  supervisorId?: string | null,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: {
      email,
      full_name: fullName,
      title,
      permission_level: permissionLevel,
      password,
      supervisor_id: supervisorId ?? null,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to invite user');
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}

export async function resetPassword(userId: string, password: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('reset-password', {
    body: { user_id: userId, password },
  });

  if (error) {
    throw new Error(error.message || 'Failed to reset password');
  }

  if (data?.error) {
    throw new Error(data.error);
  }
}

