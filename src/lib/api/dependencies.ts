import { supabase } from '../supabase';
import type { Dependency, CreateDependency, DependencyItemType } from '@/types';

export async function getAll(): Promise<Dependency[]> {
  const { data, error } = await supabase
    .from('dependencies')
    .select('*');
  if (error) throw new Error(error.message);
  return data;
}

export async function getByItem(type: DependencyItemType, id: string): Promise<Dependency[]> {
  const { data: asPredecessor, error: e1 } = await supabase
    .from('dependencies')
    .select('*')
    .eq('predecessor_type', type)
    .eq('predecessor_id', id);
  if (e1) throw new Error(e1.message);

  const { data: asSuccessor, error: e2 } = await supabase
    .from('dependencies')
    .select('*')
    .eq('successor_type', type)
    .eq('successor_id', id);
  if (e2) throw new Error(e2.message);

  return [...(asPredecessor ?? []), ...(asSuccessor ?? [])];
}

export async function create(dep: CreateDependency): Promise<Dependency> {
  const { data, error } = await supabase
    .from('dependencies')
    .insert(dep)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function remove(id: string): Promise<void> {
  const { error } = await supabase
    .from('dependencies')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
