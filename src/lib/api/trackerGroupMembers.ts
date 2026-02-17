import { supabase } from '../supabase';
import type { TrackerGroupMember, CreateTrackerGroupMember } from '@/types';

export async function getByGroup(groupId: string): Promise<TrackerGroupMember[]> {
  const { data, error } = await supabase
    .from('tracker_group_members')
    .select('*')
    .eq('tracker_group_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function add(member: CreateTrackerGroupMember): Promise<TrackerGroupMember> {
  const { data, error } = await supabase
    .from('tracker_group_members')
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('tracker_group_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
