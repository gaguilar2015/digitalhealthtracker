import { supabase } from '../supabase';
import type { WorkstreamMember, CreateWorkstreamMember } from '@/types';

export async function getByWorkstream(workstreamId: string): Promise<WorkstreamMember[]> {
  const { data, error } = await supabase
    .from('workstream_members')
    .select('*')
    .eq('workstream_id', workstreamId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function add(member: CreateWorkstreamMember): Promise<WorkstreamMember> {
  const { data, error } = await supabase
    .from('workstream_members')
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('workstream_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getMyWorkstreamIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('workstream_members')
    .select('workstream_id')
    .eq('team_member_id', userId);
  if (error) throw new Error(error.message);
  return data.map(row => row.workstream_id);
}
