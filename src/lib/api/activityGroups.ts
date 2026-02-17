import { supabase } from '../supabase';
import type { ActivityGroup, CreateActivityGroup, UpdateActivityGroup } from '@/types';

export async function getByWorkstream(wsId: string): Promise<ActivityGroup[]> {
  const { data, error } = await supabase
    .from('activity_groups')
    .select('*')
    .eq('workstream_id', wsId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function getAll(): Promise<ActivityGroup[]> {
  const { data, error } = await supabase
    .from('activity_groups')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function create(ag: CreateActivityGroup): Promise<ActivityGroup> {
  const { data, error } = await supabase
    .from('activity_groups')
    .insert(ag)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, ag: UpdateActivityGroup): Promise<ActivityGroup> {
  const { data, error } = await supabase
    .from('activity_groups')
    .update(ag)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('activity_groups')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
