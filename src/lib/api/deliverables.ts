import { supabase } from '../supabase';
import type { Deliverable, CreateDeliverable, UpdateDeliverable } from '@/types';

export async function getAll(workstreamIds?: string[]): Promise<Deliverable[]> {
  let query = supabase.from('deliverables').select('*').order('due_date');
  if (workstreamIds) {
    query = query.in('workstream_id', workstreamIds);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export async function getByWorkstream(wsId: string): Promise<Deliverable[]> {
  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .eq('workstream_id', wsId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data;
}

export async function create(del: CreateDeliverable): Promise<Deliverable> {
  const { data, error } = await supabase
    .from('deliverables')
    .insert(del)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, del: UpdateDeliverable): Promise<Deliverable> {
  const { data, error } = await supabase
    .from('deliverables')
    .update(del)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('deliverables')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
