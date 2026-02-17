import { supabase } from '../supabase';
import type { Tracker, CreateTracker, UpdateTracker } from '@/types';

export async function getAll(): Promise<Tracker[]> {
  const { data, error } = await supabase
    .from('trackers')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<Tracker> {
  const { data, error } = await supabase
    .from('trackers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(tracker: CreateTracker): Promise<Tracker> {
  const { data, error } = await supabase
    .from('trackers')
    .insert(tracker)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, tracker: UpdateTracker): Promise<Tracker> {
  const { data, error } = await supabase
    .from('trackers')
    .update(tracker)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('trackers')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
