import { supabase } from '../supabase';
import type { Diagram, CreateDiagram, UpdateDiagram } from '@/types';

export async function getAll(): Promise<Diagram[]> {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data;
}

export async function getById(id: string): Promise<Diagram> {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function create(diagram: CreateDiagram): Promise<Diagram> {
  const { data, error } = await supabase
    .from('diagrams')
    .insert(diagram)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function update(id: string, diagram: UpdateDiagram): Promise<Diagram> {
  const { data, error } = await supabase
    .from('diagrams')
    .update(diagram)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('diagrams')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
