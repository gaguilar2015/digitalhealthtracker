import { supabase } from '../supabase';
import type { Activity, CreateActivity, UpdateActivity } from '@/types';

export async function getByWorkstream(wsId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('workstream_id', wsId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function getAll(workstreamIds?: string[]): Promise<Activity[]> {
  let query = supabase.from('activities').select('*').order('sort_order');
  if (workstreamIds) {
    query = query.in('workstream_id', workstreamIds);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getByActivityGroup(agId: string): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('activity_group_id', agId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function create(act: CreateActivity): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert(act)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, act: UpdateActivity): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update(act)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
