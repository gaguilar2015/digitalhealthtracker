import { supabase } from '../supabase';
import type { TrackerMember, CreateTrackerMember } from '@/types';

export async function getByTracker(trackerId: string): Promise<TrackerMember[]> {
  const { data, error } = await supabase
    .from('tracker_members')
    .select('*')
    .eq('tracker_id', trackerId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function add(member: CreateTrackerMember): Promise<TrackerMember> {
  const { data, error } = await supabase
    .from('tracker_members')
    .insert(member)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('tracker_members')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
