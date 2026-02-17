import { supabase } from '../supabase';
import type { TrackerGroup, CreateTrackerGroup, UpdateTrackerGroup } from '@/types';

export async function getAll(): Promise<TrackerGroup[]> {
  const { data, error } = await supabase
    .from('tracker_groups')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<TrackerGroup> {
  const { data, error } = await supabase
    .from('tracker_groups')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(group: CreateTrackerGroup): Promise<TrackerGroup> {
  const { data, error } = await supabase
    .from('tracker_groups')
    .insert(group)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, group: UpdateTrackerGroup): Promise<TrackerGroup> {
  const { data, error } = await supabase
    .from('tracker_groups')
    .update(group)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('tracker_groups')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
