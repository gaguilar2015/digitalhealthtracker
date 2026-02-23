import { supabase } from '../supabase';
import type { DiagramGroup, CreateDiagramGroup, UpdateDiagramGroup } from '@/types';

export async function getAll(): Promise<DiagramGroup[]> {
  const { data, error } = await supabase
    .from('diagram_groups')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<DiagramGroup> {
  const { data, error } = await supabase
    .from('diagram_groups')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(group: CreateDiagramGroup): Promise<DiagramGroup> {
  const { data, error } = await supabase
    .from('diagram_groups')
    .insert(group)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, group: UpdateDiagramGroup): Promise<DiagramGroup> {
  const { data, error } = await supabase
    .from('diagram_groups')
    .update(group)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('diagram_groups')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
