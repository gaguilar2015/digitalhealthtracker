import { supabase } from '../supabase';
import type { Workstream, CreateWorkstream, UpdateWorkstream } from '@/types';

export async function getAll(workstreamIds?: string[]): Promise<Workstream[]> {
  let query = supabase.from('workstreams').select('*').order('sort_order');
  if (workstreamIds) {
    query = query.in('id', workstreamIds);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getByCode(code: string): Promise<Workstream | null> {
  const { data, error } = await supabase
    .from('workstreams')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<Workstream> {
  const { data, error } = await supabase
    .from('workstreams')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(ws: CreateWorkstream): Promise<Workstream> {
  const { data, error } = await supabase
    .from('workstreams')
    .insert(ws)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, ws: UpdateWorkstream): Promise<Workstream> {
  const { data, error } = await supabase
    .from('workstreams')
    .update(ws)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('workstreams')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
